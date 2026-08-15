from django.test import SimpleTestCase


class HealthEndpointTests(SimpleTestCase):
    def test_health_endpoint(self) -> None:
        response = self.client.get("/api/v1/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
