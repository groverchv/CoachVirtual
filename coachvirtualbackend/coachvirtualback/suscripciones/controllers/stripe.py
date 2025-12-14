import stripe
from decouple import config
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

stripe.api_key = config('STRIPE_SECRET_KEY')

@csrf_exempt
def crear_checkout_session(request):
	if request.method == 'POST':
		try:
			# Reemplaza con el ID real del precio de tu plan en Stripe
			price_id = 'price_1SMV7NHvcVZ8b6hFHYSuektD'  # price_id real de Stripe
			success_url = 'http://localhost:5173/planes/pago?success=true'
			cancel_url = 'http://localhost:5173/planes/pago?canceled=true'
			checkout_session = stripe.checkout.Session.create(
				payment_method_types=['card'],
				mode='subscription',
				line_items=[{
					'price': price_id,
					'quantity': 1,
				}],
				success_url=success_url,
				cancel_url=cancel_url,
			)
			return JsonResponse({'url': checkout_session.url})
		except Exception as e:
			return JsonResponse({'error': str(e)}, status=400)
	return JsonResponse({'error': 'Método no permitido'}, status=405)
