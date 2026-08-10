# Cartly end-to-end tests

These Maestro flows exercise the installed Android application against a running test API.

Prerequisites:

1. Install Maestro and connect one Android device or emulator.
2. Start the backend and Metro.
3. Seed a verified E2E customer with a saved default address.
4. Set `TEST_EMAIL` and `TEST_PASSWORD` in the terminal environment.

Run the smoke flow:

```powershell
maestro test e2e/smoke.yaml
```

Run the buying flow:

```powershell
$env:TEST_EMAIL="e2e-user@example.com"
$env:TEST_PASSWORD="YourTestPassword"
maestro test e2e/buying-flow.yaml
```

The buying flow intentionally stops on the final Place Order confirmation so local test runs do not create accidental orders. A CI-only extension can tap Place Order and then verify order history, admin fulfilment, cancellation and return workflows against disposable test data.
