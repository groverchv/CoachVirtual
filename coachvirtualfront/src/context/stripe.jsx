// Contexto o función para iniciar el pago con Stripe
export async function iniciarPagoStripe() {
	try {
		const response = await fetch('http://localhost:8000/api/suscripciones/stripe/checkout/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		const data = await response.json();
		if (data.url) {
			window.location.href = data.url; // Redirige al checkout de Stripe
		} else {
			alert('Error al iniciar el pago: ' + (data.error || 'Desconocido'));
		}
	} catch (error) {
		alert('Error de conexión con el servidor de pagos.');
	}
}
