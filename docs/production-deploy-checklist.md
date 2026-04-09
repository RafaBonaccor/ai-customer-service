# Production Deploy Checklist

Questa checklist serve per deployare `ai-secretary-web`, `assistant-core` ed `evolution-api` senza perdere il controllo di env, DNS, OAuth e runtime.

## 1. Pre-deploy

- Verifica che `main` sia in stato deployabile.
- Verifica che non ci siano secret reali committati.
- Aggiorna i file di esempio:
  - `ai-secretary-web/.env.example`
  - `assistant-core/.env.example` se presente
- Verifica che il diagramma [deployment-env-map.drawio](/c:/Users/utente/Documents/Personal_Worskpace/evolution-api/docs/deployment-env-map.drawio) sia coerente con lo stato attuale.
- Verifica che le migration Flyway siano complete e ordinate.
- Verifica che il login utente, onboarding e Google Calendar funzionino in locale.

## 2. Secret Inventory

- Conferma dove vive ogni secret:
  - `Vercel`
  - `/opt/assistant-core/.env`
  - `/opt/evolution-api/.env`
  - `Supabase`
  - `Google Cloud Console`
- Verifica che i secret critici siano documentati in un vault:
  - `APP_BASIC_AUTH_PASSWORD`
  - `OPENAI_API_KEY`
  - `EVOLUTION_API_KEY`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_TOKEN_ENCRYPTION_SECRET`
  - password DB
- Se un secret è stato esposto, ruotalo prima del deploy.

## 3. Frontend Vercel

- Verifica env `Production`:
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `ASSISTANT_CORE_BASE_URL`
  - `ASSISTANT_CORE_BASIC_USER`
  - `ASSISTANT_CORE_BASIC_PASSWORD`
- Verifica che il dominio corretto sia collegato:
  - `zapatende.com`
  - `app.zapatende.com` se usato
- Verifica che `Production`, `Preview`, `Development` non siano confusi.
- Fai redeploy del frontend.
- Testa:
  - caricamento home
  - onboarding
  - registrazione/login
  - chiamata al backend

## 4. Backend assistant-core sul VPS

- Accedi al VPS.
- Vai in:
  - `/opt/assistant-core`
- Verifica `/opt/assistant-core/.env`:
  - datasource Supabase
  - basic auth
  - OpenAI
  - Evolution
  - Google OAuth
  - `GOOGLE_OAUTH_REDIRECT_URI`
- Verifica che il redirect URI di produzione punti al callback backend pubblico corretto.
- Verifica che `docker-compose.yml` non contenga secret hardcoded non voluti.
- Esegui:

```bash
cd /opt/assistant-core
docker compose up -d --build
```

- Testa:

```bash
curl http://127.0.0.1:8090/api/v1/health
curl https://api.zapatende.com/api/v1/health
docker logs assistant_core_app --tail 200
```

## 5. Evolution API sul VPS

- Vai in:
  - `/opt/evolution-api`
- Verifica `.env`:
  - `SERVER_URL`
  - `AUTHENTICATION_API_KEY`
  - DB / Redis
  - webhook config
- Verifica che il webhook punti al backend corretto.
- Esegui:

```bash
cd /opt/evolution-api
docker compose up -d --build
```

- Testa:

```bash
curl http://127.0.0.1:8080
docker logs evolution_api_safe --tail 200
```

## 6. Caddy / Reverse Proxy

- Verifica `/etc/caddy/Caddyfile`
- Verifica che almeno questo sia corretto:

```caddy
api.zapatende.com {
    reverse_proxy 127.0.0.1:8090
}
```

- Se usi altri host, verifica che non puntino a servizi sbagliati.
- Valida e ricarica:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
systemctl status caddy
```

## 7. DNS

- Verifica su Porkbun:
  - `zapatende.com` -> Vercel
  - `app.zapatende.com` -> Vercel se usato
  - `api.zapatende.com` -> VPS
- Verifica che non ci siano vecchi `A`, `CNAME`, redirect o forwarding in conflitto.

## 8. Supabase

- Verifica `Authentication -> URL Configuration`
- `Site URL` corretto
- `Redirect URLs` corrette per:
  - produzione frontend
  - onboarding
  - locale se vuoi mantenerlo
- Verifica che `Project URL` e `anon key` usate nel frontend siano del progetto corretto.
- Verifica che il DB sia raggiungibile dal backend.

## 9. Google Cloud

- Verifica che `Google Calendar API` sia abilitata.
- Verifica `OAuth consent screen`.
- Verifica `Authorized redirect URIs`.
- Verifica che il `GOOGLE_OAUTH_CLIENT_ID` e `GOOGLE_OAUTH_CLIENT_SECRET` in produzione siano quelli giusti.
- Se hai ruotato `GOOGLE_OAUTH_TOKEN_ENCRYPTION_SECRET`, pianifica il ricollegamento dei calendari.

## 10. Smoke Test Finale

- Apri il frontend pubblico.
- Registrazione / login.
- Crea o riprendi tenant.
- Collega Google Calendar.
- Verifica lista calendari.
- Invia un messaggio WhatsApp di test.
- Verifica:
  - risposta assistant
  - check disponibilita
  - create event
  - list event
  - eventuale update / delete

## 11. Logs da controllare

- `assistant-core`
  - health ok
  - nessun `401` inatteso
  - nessun `Schema-validation missing table`
  - nessun `Google Calendar ... bad request`
- `evolution-api`
  - nessun timeout webhook
  - niente loop di reconnect
- `Caddy`
  - certificati TLS ok

## 12. Post-deploy

- Aggiorna il vault con eventuali secret nuovi o ruotati.
- Aggiorna il diagramma env/deploy se è cambiato qualcosa.
- Annota:
  - commit deployato
  - data deploy
  - secret ruotati
  - problemi incontrati

## 13. Regole operative

- Non committare mai secret reali.
- Non fare debug produzione modificando config senza annotarlo.
- Non ruotare `GOOGLE_OAUTH_TOKEN_ENCRYPTION_SECRET` senza sapere che rompe la lettura dei token salvati.
- Non usare il VPS come ambiente principale di sviluppo.
- Tratta il VPS come staging/production, non come sandbox.
