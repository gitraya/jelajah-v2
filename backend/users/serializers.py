from rest_framework import serializers
from django.contrib.auth import get_user_model

from backend.images import delete_replaced_file, process_image

User = get_user_model()

MAX_INTERESTS = 6
MAX_INTEREST_LENGTH = 30


def clean_interests(value):
    """Trim, drop case-insensitive duplicates and bound a list of interest tags."""
    if not isinstance(value, list):
        raise serializers.ValidationError('Expected a list of strings.')
    cleaned, seen = [], set()
    for item in value:
        if not isinstance(item, str):
            raise serializers.ValidationError('Each interest must be a string.')
        item = item.strip()
        if not item:
            raise serializers.ValidationError('Interests cannot be blank.')
        if len(item) > MAX_INTEREST_LENGTH:
            raise serializers.ValidationError(f'Each interest must be at most {MAX_INTEREST_LENGTH} characters.')
        if item.lower() not in seen:
            seen.add(item.lower())
            cleaned.append(item)
    if len(cleaned) > MAX_INTERESTS:
        raise serializers.ValidationError(f'At most {MAX_INTERESTS} interests are allowed.')
    return cleaned


class ProfileFieldsMixin(serializers.Serializer):
    """Profile + presence fields shared by the user serializers."""
    interests = serializers.JSONField(required=False)
    is_online = serializers.BooleanField(read_only=True)

    def validate_interests(self, value):
        return clean_interests(value)


class UserSerializer(ProfileFieldsMixin, serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'bio', 'avatar', 'location', 'interests', 'last_seen', 'is_online']
        read_only_fields = ['id', 'email', 'last_seen']

class UserDetailSerializer(ProfileFieldsMixin, serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'bio', 'avatar', 'date_joined', 'phone', 'location', 'interests', 'last_seen', 'is_online']
        read_only_fields = ['id', 'email', 'date_joined', 'last_seen']

    def validate_avatar(self, value):
        return process_image(value, max_side=512) if value else value

    def update(self, instance, validated_data):
        if 'avatar' not in validated_data:
            return super().update(instance, validated_data)
        old_avatar = instance.avatar
        instance = super().update(instance, validated_data)
        delete_replaced_file(old_avatar, instance.avatar.name)
        return instance

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    first_name = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'password2', 'first_name', 'last_name']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        return attrs
    
    def validate_email(self, value):
        user = User.objects.filter(email=value).first()
        if user and user.has_usable_password() == False:
            raise serializers.ValidationError("User with this email already exists. Please set your password to activate your account.")
        elif user:
            raise serializers.ValidationError("User with this email already exists.")
        return value
        
    
    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one number.")
        if not any(char.isalpha() for char in value):
            raise serializers.ValidationError("Password must contain at least one letter.")
        if not any(char.isupper() for char in value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not any(char.islower() for char in value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not any(char in '!@#$%^&*()_+-=[]{}|;:,.<>?/' for char in value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        return value
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user

class SetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    new_password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "New password fields didn't match."})
        return attrs
    
class ResendSetPasswordEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

class GoogleAuthSerializer(serializers.Serializer):
    """Whatever Google Identity Services handed the frontend.

    `code` comes from the popup authorization-code flow (the app's own button),
    `credential` is an ID token straight from Google's rendered button / One Tap.
    """
    code = serializers.CharField(required=False, write_only=True, trim_whitespace=True)
    credential = serializers.CharField(required=False, write_only=True, trim_whitespace=True)

    def validate(self, attrs):
        if bool(attrs.get('code')) == bool(attrs.get('credential')):
            raise serializers.ValidationError('Provide either a "code" or a "credential".')
        return attrs


class SharedTripSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    destination = serializers.CharField()
    start_date = serializers.DateField()


class BuddySerializer(UserSerializer):
    """A user who shares an accepted trip with the requester (see users/services.py)."""
    trips_count = serializers.IntegerField(read_only=True)
    mutual_count = serializers.IntegerField(read_only=True)
    shared_trips = SharedTripSerializer(many=True, read_only=True)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ['trips_count', 'mutual_count', 'shared_trips']
        read_only_fields = fields
