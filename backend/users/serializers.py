from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'bio', 'avatar']
        read_only_fields = ['id', 'email']

class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'bio', 'avatar', 'date_joined', 'phone']
        read_only_fields = ['id', 'email', 'date_joined']

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
