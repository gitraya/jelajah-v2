from django.urls import path
from .views import ConversationListView, MessageListView, UnreadCountView

urlpatterns = [
    path('messages/conversations/', ConversationListView.as_view(), name='conversation-list'),
    path('messages/conversations/<uuid:pk>/messages/', MessageListView.as_view(), name='conversation-messages'),
    path('messages/unread-count/', UnreadCountView.as_view(), name='messages-unread-count'),
]
