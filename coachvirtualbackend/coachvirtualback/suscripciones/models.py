from django.db import models
from usuarios.models import Usuario


class HistorialSuscripcion(models.Model):
    """
    Tabla para guardar el historial de suscripciones de cada usuario.
    Cada vez que un usuario cambia de plan, se crea un nuevo registro.
    """
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='historial_suscripciones')
    
    plan = models.CharField(
        max_length=20,
        choices=[
            ('gratis', 'Gratis'),
            ('basico', 'Básico'),
            ('premium', 'Premium')
        ],
        help_text='Plan adquirido'
    )
    
    # Fechas
    fecha_inicio = models.DateTimeField(auto_now_add=True, help_text='Fecha de inicio del plan')
    fecha_expiracion = models.DateTimeField(help_text='Fecha de expiración del plan')
    
    # Información de pago
    monto_pagado = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text='Monto pagado en Bs.'
    )
    metodo_pago = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text='Método de pago utilizado (QR, Tarjeta, etc.)'
    )
    referencia_pago = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text='ID de transacción o referencia de pago'
    )
    
    # Estado
    activo = models.BooleanField(default=True, help_text='Si esta suscripción está activa')
    cancelado = models.BooleanField(default=False, help_text='Si fue cancelado manualmente')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'historial_suscripciones'
        ordering = ['-fecha_inicio']
        verbose_name = 'Historial de Suscripción'
        verbose_name_plural = 'Historial de Suscripciones'
        indexes = [
            models.Index(fields=['usuario', '-fecha_inicio']),
            models.Index(fields=['activo']),
        ]
    
    def __str__(self):
        return f"{self.usuario.email} - {self.plan} ({self.fecha_inicio.strftime('%Y-%m-%d')})"

