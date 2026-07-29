from decimal import Decimal
from rest_framework import serializers
from .models import Expense, ExpenseSplit, ExpenseCategory
from django.db import transaction
from django.contrib.auth import get_user_model
from trips.serializers import TripMemberSerializer
from trips.models import TripMember, MemberStatus, Trip

User = get_user_model()

class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ['id', 'name']

class ExpenseSplitSerializer(serializers.ModelSerializer):
    member = TripMemberSerializer(read_only=True)
    member_id = serializers.PrimaryKeyRelatedField(queryset=TripMember.objects.all(), source='member', write_only=True)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    
    class Meta:
        model = ExpenseSplit
        fields = ['id', 'member', 'amount', 'paid', 'member_id']
        read_only_fields = ['id', 'expense']
        
    def validate_member_id(self, value):
        if 'trip_id' not in self.context:
            expense_id = self.context['expense_id']
            if expense_id:
                expense = Expense.objects.get(id=expense_id)
                trip_id = expense.trip_id
                trip_member = TripMember.objects.get(id=value.id)
                if trip_member.trip_id != trip_id:
                    raise serializers.ValidationError("Member does not belong to the trip associated with this expense.")
                if trip_member.status != MemberStatus.ACCEPTED:
                    raise serializers.ValidationError("Member is not an accepted member of the trip.")
            else:
                raise serializers.ValidationError("Trip context is missing for validation.")

        return value
    
    def create(self, validated_data):
        expense_id = self.context['expense_id']
        validated_data['expense_id'] = expense_id
        return super().create(validated_data)

class ExpenseSerializer(serializers.ModelSerializer):
    splits = ExpenseSplitSerializer(many=True)
    paid_by = TripMemberSerializer(read_only=True)
    paid_by_id = serializers.PrimaryKeyRelatedField(queryset=TripMember.objects.all(), source='paid_by', write_only=True)
    category = ExpenseCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(queryset=ExpenseCategory.objects.all(), source='category', write_only=True, required=True)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False, required=True)
    
    class Meta:
        model = Expense
        fields = ['id', 'title', 'amount', 'date', 'paid_by', 'notes', 'splits', 'category', 'category_id', 'paid_by_id']
    
    def validate(self, attrs):
        splits_data = attrs.get('splits', [])
        total_split_amount = sum([split['amount'] for split in splits_data])
        amount = attrs.get('amount')
        
        if splits_data and total_split_amount != amount:
            raise serializers.ValidationError("Total of split amounts must equal the expense amount.")
        
        return attrs
    
    def validate_splits(self, value):
        if not value:
            raise serializers.ValidationError("At least one split is required.")
        
        trip_id = self.context['trip_id']
        paid_by_raw = self.initial_data.get('paid_by_id')
        try:
            paid_by_id = TripMember.objects.only('id').get(pk=paid_by_raw).id
        except TripMember.DoesNotExist:
            raise serializers.ValidationError("Invalid 'paid_by_id'; member not found.")
        
        member_ids = set()
        is_paid_by_in_splits = False
        for split in value:
            # After nested validation, each split contains a 'member' instance, not 'member_id'
            member = split.get('member')
            if member is None:
                raise serializers.ValidationError("Each split must include a member.")
            member_id = member.id

            if not TripMember.objects.filter(id=member_id, trip_id=trip_id).exists():
                raise serializers.ValidationError(f"Member {member_id} does not belong to this trip.")
            if member_id in member_ids:
                raise serializers.ValidationError(f"Member {member_id} is duplicated in splits.")
            member_ids.add(member_id)
            if member_id == paid_by_id:
                is_paid_by_in_splits = True
            if member_id == paid_by_id and not split.get('paid', False):
                raise serializers.ValidationError(f"Paid by member {member_id} must have 'paid' set to True.")

        if not is_paid_by_in_splits:
            raise serializers.ValidationError("The 'paid_by' member must be included in the splits.")
        
        expense_amount = Decimal(str(self.initial_data.get('amount')))
        total_split_amount = sum([split['amount'] for split in value])
        if total_split_amount != expense_amount:
            raise serializers.ValidationError("Total of split amounts must equal the expense amount.")
        
        return value
    
    def validate_paid_by_id(self, value):
        trip_id = self.context['trip_id']
        trip_member = TripMember.objects.get(id=value.id)
        if trip_member.trip_id != trip_id:
            raise serializers.ValidationError("Assigned member does not belong to this trip.")
        if trip_member.status != MemberStatus.ACCEPTED:
            raise serializers.ValidationError("Assigned member is not an accepted member of the trip.")
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        trip_id = self.context['trip_id']
        validated_data['trip_id'] = trip_id
        splits_data = validated_data.pop('splits', [])
        
        expense = super().create(validated_data)

        for split_data in splits_data:
            ExpenseSplit.objects.create(expense=expense, **split_data)

        return expense

    @transaction.atomic
    def update(self, instance, validated_data):
        # Absent 'splits' means a partial update that isn't touching them;
        # an empty list would mean "remove them all", which validate_splits
        # already rejects.
        splits_data = validated_data.pop('splits', None)
        instance = super().update(instance, validated_data)

        if splits_data is None:
            return instance

        # Reconcile on member, not on split id: 'id' is read-only on
        # ExpenseSplitSerializer, so it never survives validation and matching
        # on it would recreate every split, tripping the unique
        # (expense, member) constraint.
        existing_splits = {split.member_id: split for split in instance.splits.all()}
        members_to_keep = set()

        for split_data in splits_data:
            member = split_data.get('member')
            split = existing_splits.get(member.id) if member else None
            if split:
                for attr, value in split_data.items():
                    setattr(split, attr, value)
                split.save()
            else:
                ExpenseSplit.objects.create(expense=instance, **split_data)
            if member:
                members_to_keep.add(member.id)

        # Delete splits for members no longer part of the expense.
        for member_id, split in existing_splits.items():
            if member_id not in members_to_keep:
                split.delete()

        return instance
