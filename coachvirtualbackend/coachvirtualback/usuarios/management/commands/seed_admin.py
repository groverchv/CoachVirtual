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
            # Actualizar usuario existente
            user.set_password(password)
            user.is_superuser = True
            user.is_staff = True
            user.nombre = 'Grover'
            user.apellido = 'Choquevillca'
            user.save()
            self.stdout.write(self.style.SUCCESS(f'✅ Usuario administrador actualizado:'))
            self.stdout.write(f'   Email: {email}')
            self.stdout.write(f'   Password: {password}')
            self.stdout.write(f'   Superusuario: Sí')
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
