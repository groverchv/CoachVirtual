from django.urls import path
from .controllers.usuario_controller import (
    UsuarioListaCrearVista, UsuarioDetalleVista, MeView,
)
from .controllers.alerta_controller import (
    AlertasListaCrearVista, AlertasDetalleVista,
    MisAlertasVista, MisAlertasUltimasVista,
)

urlpatterns = [
    # Usuario
    path("usuarios/me/", MeView.as_view(), name="me"),
    path("usuarios/", UsuarioListaCrearVista.as_view(), name="usuario-lista-crear"),
    path("usuarios",  UsuarioListaCrearVista.as_view()),
    path("usuarios/<int:pk>/", UsuarioDetalleVista.as_view(), name="usuario-detalle"),
    path("usuarios/<int:pk>",  UsuarioDetalleVista.as_view()),

    # Alertas
    path("alertas/mis-alertas/", MisAlertasVista.as_view(), name="mis-alertas"),
    path("alertas/mis-alertas/ultimas/", MisAlertasUltimasVista.as_view(), name="mis-alertas-ultimas"),
    path("alertas/",  AlertasListaCrearVista.as_view(), name="alerta-lista-crear"),
    path("alertas",   AlertasListaCrearVista.as_view()),
    path("alertas/<int:pk>/", AlertasDetalleVista.as_view(), name="alerta-detalle"),
    path("alertas/<int:pk>",  AlertasDetalleVista.as_view()),
]
