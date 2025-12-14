from django.urls import path
from . import views

urlpatterns = [
    path("dispositivo/googlefit/", views.googlefit_stats, name="dispositivo-googlefit-stats"),
]
