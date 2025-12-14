"""
Endpoints del módulo dispositivo
 - Google Fit (cuenta fija)
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .googlefit import GoogleFitClient
import logging
import requests

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def googlefit_stats(request):
    """
    GET /api/dispositivo/googlefit/
    Retorna pasos, calorías y frecuencia cardiaca del día desde Google Fit
    usando la cuenta fija configurada en variables de entorno.
    """
    try:
        client = GoogleFitClient()
        data = client.get_today_stats()
        return Response(data, status=status.HTTP_200_OK)
    except ValueError as e:
        # Error de configuración (p.e. faltan tokens) => 400
        logger.warning("GoogleFit configuración inválida: %s", e)
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except requests.HTTPError as e:
        # Errores HTTP externos: mapear según código externo
        code = e.response.status_code if e.response is not None else 502
        logger.error("GoogleFit HTTPError %s: %s", code, e)
        if code == 401:
            return Response({"error": "Token de Google Fit inválido o expirado"}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"error": f"Error externo Google Fit ({code})"}, status=status.HTTP_502_BAD_GATEWAY)
    except requests.RequestException as e:
        # Problemas de red/timeouts
        logger.error("GoogleFit RequestException: %s", e)
        return Response({"error": "Fallo de red hacia Google Fit"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        logger.exception("Error inesperado en googlefit_stats")
        return Response({"error": "Error interno al obtener estadísticas"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
