"""
Comando para crear el usuario administrador por defecto.
Ejecutar con: python manage.py seed_admin
"""
from django.core.management.base import BaseCommand
from usuarios.models import Usuario


class Command(BaseCommand):
    help = 'Crea el usuario administrador por defecto si no existe'

    def handle(self, *args, **options):
        email = 'groverchoquevillca80@gmail.com'
        password = 'muerte'
        
        # Verificar si ya existe
        if Usuario.objects.filter(email=email).exists():
            user = Usuario.objects.get(email=email)
            # Asegurar que sea superusuario
            if not user.is_superuser:
                user.is_superuser = True
                user.is_staff = True
                user.save()
                self.stdout.write(self.style.SUCCESS(f'✅ Usuario {email} actualizado como superusuario'))
            else:
                self.stdout.write(self.style.WARNING(f'⚠️ Usuario administrador ya existe: {email}'))
            return
        
        # Crear usuario administrador
        try:
            user = Usuario.objects.create_superuser(
                email=email,
                password=password,
                nombre='Grover',
                apellido='Choquevillca',
            )
            self.stdout.write(self.style.SUCCESS(f'✅ Usuario administrador creado exitosamente:'))
            self.stdout.write(f'   Email: {email}')
            self.stdout.write(f'   Password: {password}')
            self.stdout.write(f'   Superusuario: Sí')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error creando usuario: {e}'))
