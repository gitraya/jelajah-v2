from rest_framework import serializers
from django.db import models
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.text import slugify
from django.contrib.auth import get_user_model
from .models import Trip, TripMember, MemberStatus, MemberRole, TripStatus, Tag
from expenses.models import ExpenseSplit, Expense
from itineraries.models import ItineraryItem, ItineraryStatus
from backend.images import process_image

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone', 'avatar']
        read_only_fields = ['id', 'avatar']
        
class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class TripMemberSerializer(serializers.ModelSerializer):
    """Serializer for TripMember model with user details"""
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True,
        required=False
    )
    first_name = serializers.CharField(
        source='user.first_name',
        write_only=True,
        required=False
    )
    last_name = serializers.CharField(
        source='user.last_name',
        write_only=True,
        required=False
    )
    email = serializers.EmailField(
        source='user.email',
        write_only=True,
        required=False
    )
    phone = serializers.CharField(
        source='user.phone',
        write_only=True,
        required=False
    )
    expenses = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = TripMember
        fields = ['id', 'user', 'user_id', 'joined_at', 'status', 'role', 'emergency_contact_name', 'emergency_contact_phone', 'dietary_restrictions', 'first_name', 'last_name', 'email', 'phone', 'expenses']
        read_only_fields = ['id', 'joined_at']
        
    def validate(self, attrs):
        """Ensure that user information is provided either by user_id or email.
        Run this validation only on create (when self.instance is None).
        """
        # Only validate on create
        if self.instance is not None:
            if self.instance.user == self.context['request'].user:
                # Prevent changing own status or role
                if 'status' in attrs or 'role' in attrs:
                    raise serializers.ValidationError("You cannot change your own status or role.")

            if self.instance.trip.owner == self.instance.user:
                # Prevent changing owner's status or role
                if 'status' in attrs or 'role' in attrs:
                    raise serializers.ValidationError("You cannot change the owner's status or role.")

            return attrs

        user_val = attrs.get('user')
        # If a PK was provided, DRF will already have resolved it to a User instance
        if isinstance(user_val, User):
            user_obj = user_val
        # If write-only fields (source='user.xxx') were used, DRF supplies a dict under 'user'
        elif isinstance(user_val, dict):
            email = user_val.get('email')
            if not email:
                raise serializers.ValidationError("Either user_id or email must be provided.")
            try:
                user_obj = User.objects.get(email=email)
            except User.DoesNotExist:
                user_obj = User.objects.create(
                    email=email,
                    first_name=user_val.get('first_name', ''),
                    last_name=user_val.get('last_name', ''),
                    phone=user_val.get('phone', '')
                )
                user_obj.set_unusable_password()
                user_obj.save()
        else:
            raise serializers.ValidationError("Either user_id or email must be provided.")

        attrs['user'] = user_obj

        trip_id = self.context.get('trip')
        if trip_id is None:
            raise serializers.ValidationError("Trip context is required for validation.")

        if TripMember.objects.filter(user=user_obj, trip_id=trip_id).exists():
            raise serializers.ValidationError("This user is already a member of the trip.")

        return attrs
        
    def create(self, validated_data):
        validated_data.pop('first_name', None)
        validated_data.pop('last_name', None)
        validated_data.pop('email', None)
        validated_data.pop('phone', None)
        
        adder = self.context['request'].user
        trip = Trip.objects.get(id=self.context['trip'])
        # Auto-accept if the adder is the trip owner
        if adder == trip.owner:
            validated_data['status'] = MemberStatus.ACCEPTED
             
        trip_id = self.context['trip']
        validated_data['trip_id'] = trip_id
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Remove user because we only need on create"""
        validated_data.pop('first_name', None)
        validated_data.pop('last_name', None)
        validated_data.pop('email', None)
        validated_data.pop('phone', None)
        validated_data.pop('user', None)
        
        return super().update(instance, validated_data)
    
    def to_representation(self, instance):
        """Add expenses field to the representation"""
        representation = super().to_representation(instance)
        expenses = ExpenseSplit.objects.filter(
            member=instance
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        representation['expenses'] = expenses
        return representation

class TripSerializer(serializers.ModelSerializer):
    """Detailed serializer for Trip model"""
    owner = UserSerializer(read_only=True)
    members_count = serializers.IntegerField(read_only=True)
    is_editable = serializers.SerializerMethodField()
    is_deletable = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    highlights = serializers.ListField(child=serializers.CharField(), read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    new_tag_names = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )
    new_tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    remove_tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    spent_budget = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    user_role = serializers.CharField(read_only=True)

    class Meta:
        model = Trip
        exclude = ['members']
        # Set through the dedicated /cover/ endpoint (multipart), not trip edits.
        read_only_fields = ['id', 'created_at', 'updated_at', 'cover_image']
    
    def validate_start_date(self, start_date):
        """Validate that start_date is not in the past"""        
        end_date = parse_date(self.initial_data['end_date'])
        if end_date is None:
            raise serializers.ValidationError("Invalid end date format")
            
        if start_date >= end_date:
            raise serializers.ValidationError("Start date must be before end date")
        elif not self.instance and start_date < timezone.now().date():
            raise serializers.ValidationError("Start date cannot be in the past.")
        return start_date
    
    def validate_end_date(self, end_date):
        """Validate that end_date is after start_date"""        
        start_date = parse_date(self.initial_data['start_date'])
        if start_date is None:
            raise serializers.ValidationError("Invalid start date format")
            
        if end_date <= start_date:
            raise serializers.ValidationError("End date must be after start date")
        return end_date

    def validate_member_spots(self, member_spots):
        """Validate that member_spots is at least 1"""        
        if member_spots < 1:
            raise serializers.ValidationError("Member spots must be at least 1.")
        
        members_count = self.instance.trip_members.filter(status=MemberStatus.ACCEPTED).count() if self.instance else 0
        if member_spots < members_count:
            raise serializers.ValidationError(f"Member spots cannot be less than current accepted members count ({members_count}).")
        
        return member_spots
    
    def create(self, validated_data):
        request = self.context['request']
        owner = request.user
        
        # Handle new tag ids
        tags = validated_data.pop('new_tag_ids', [])
        for tag in tags:
            tag.usage_count = models.F('usage_count') + 1
            tag.save()
        
        # Handle new tags creation
        new_tag_names = validated_data.pop('new_tag_names', [])
        for tag_name in new_tag_names:
            tag, _ = Tag.objects.get_or_create(
                name=tag_name,
                defaults={'slug': slugify(tag_name)}
            )
            tags.append(tag)
        
        trip = Trip.objects.create(owner=owner, **validated_data)
        trip.tags.set(tags)
        TripMember.objects.create(user=owner, trip=trip, status=MemberStatus.ACCEPTED, role=MemberRole.ORGANIZER)

        return trip
    
    def update(self, instance, validated_data):
        """Remove owner because we don't want to update it"""
        validated_data.pop('owner', None)
        
        # Handle new tag ids
        tags = list(instance.tags.all())
        new_tag_ids = validated_data.pop('new_tag_ids', [])
        for tag in new_tag_ids:
            if tag not in tags:
                tag.usage_count = models.F('usage_count') + 1
                tag.save()
                tags.append(tag)
        
        # Handle new tags creation
        new_tag_names = validated_data.pop('new_tag_names', [])
        for tag_name in new_tag_names:
            tag, _ = Tag.objects.get_or_create(
                name=tag_name,
                defaults={'slug': slugify(tag_name)}
            )
            tags.append(tag)
            
        # Handle tags removal usage count decrement
        remove_tags = validated_data.pop('remove_tag_ids', [])
        for tag in remove_tags:
            if tag in tags:
                tag.refresh_from_db()
                if tag.usage_count > 0:
                    tag.usage_count = models.F('usage_count') - 1
                    tag.save()
                tags.remove(tag)

        instance = super().update(instance, validated_data)
        instance.tags.set(tags)
        return instance
    
    def get_is_editable(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        user = request.user
        if user == obj.owner and obj.status != TripStatus.DELETED:
            return True
        elif obj.trip_members.filter(user=user, status=MemberStatus.ACCEPTED).exclude(role=MemberRole.MEMBER).exists() and obj.status != TripStatus.DELETED:
            return True
        return False

    def get_is_deletable(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        user = request.user
        if user == obj.owner and obj.status != TripStatus.DELETED:
            return True
        return False

    def get_is_member(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        user = request.user
        return obj.trip_members.filter(user=user, status=MemberStatus.ACCEPTED).exists()
    
    def to_representation(self, instance):
        """Add highlights field to the representation"""
        representation = super().to_representation(instance)
        highlights = ItineraryItem.objects.filter(
            trip=instance
        ).exclude(
            status=ItineraryStatus.SKIPPED
        ).values_list('name', flat=True)
        spent_budget = Expense.objects.filter(
            trip=instance
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        members_count = TripMember.objects.filter(
            trip=instance,
            status=MemberStatus.ACCEPTED
        ).count()
        user_role = None
        if self.context and self.context.get('request') and self.context['request'].user.is_authenticated:
            user_role = TripMember.objects.filter(
                trip=instance,
                user=self.context['request'].user,
                status=MemberStatus.ACCEPTED
            ).values_list('role', flat=True).first()
        representation['spent_budget'] = spent_budget
        representation['highlights'] = list(highlights)
        representation['members_count'] = members_count
        representation['user_role'] = user_role
        return representation


class TripCoverSerializer(serializers.ModelSerializer):
    cover_image = serializers.ImageField()

    class Meta:
        model = Trip
        fields = ['cover_image']

    def validate_cover_image(self, value):
        return process_image(value, max_side=1600)
