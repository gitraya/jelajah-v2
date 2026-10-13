from datetime import timedelta

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from backend.models import BaseModel

# A user counts as online when their last authenticated request is this recent.
ONLINE_WINDOW = timedelta(minutes=5)
# `last_seen` is written at most this often per user (see users/authentication.py).
LAST_SEEN_WRITE_INTERVAL = timedelta(seconds=60)

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser, BaseModel):
    """Extended user model for Jelajah"""
    username = None  # Remove username field
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    email = models.EmailField(unique=True, max_length=255)
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=100, blank=True)
    interests = models.JSONField(default=list, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # Remove 'username' from required fields
    
    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def is_online(self):
        return bool(self.last_seen) and timezone.now() - self.last_seen < ONLINE_WINDOW

    def touch_last_seen(self):
        """Record activity, writing to the DB at most once per LAST_SEEN_WRITE_INTERVAL."""
        now = timezone.now()
        if self.last_seen and now - self.last_seen < LAST_SEEN_WRITE_INTERVAL:
            return False
        User.objects.filter(pk=self.pk).update(last_seen=now)
        self.last_seen = now
        return True
