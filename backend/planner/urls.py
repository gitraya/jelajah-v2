from django.urls import path
from .views import PlannerItineraryView, PlannerSaveView

urlpatterns = [
    path('planner/itinerary/', PlannerItineraryView.as_view(), name='planner-itinerary'),
    path('planner/itinerary/save/', PlannerSaveView.as_view(), name='planner-save'),
]
