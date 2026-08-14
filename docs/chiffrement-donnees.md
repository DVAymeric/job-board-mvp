# Chiffrement des données (JOB-120)

## In-transit (connexion à la base) — fait

`lib/prisma.ts` refuse de démarrer en production (`NODE_ENV=production`) si
`DATABASE_URL` ou `DIRECT_URL` ne force pas explicitement TLS
(`sslmode=require`/`verify-full`/`verify-ca`, ou `ssl=true`) — voir
`lib/db-security.ts` (`assertDatabaseUrlIsEncrypted`, testé). Aucune
vérification en dev/local (le Postgres docker-compose n'utilise pas TLS).

`.env.example` documente le paramètre attendu sur les URLs de production.
Les chaînes de connexion fournies par les hébergeurs managés courants
(Supabase, Vercel Postgres, Neon) l'incluent déjà par défaut — ne pas le
retirer en copiant la valeur dans les variables d'environnement Vercel.

## At-rest (chiffrement sur disque côté fournisseur) — à confirmer au provisionnement

**Non encore vérifiable** : aucune instance Postgres managée n'est
provisionnée à ce jour (le code utilise le provider `postgresql`, mais
l'environnement réel tourne encore sur le Postgres local docker-compose).
C'est une fonctionnalité native côté fournisseur, pas quelque chose à
construire — mais elle doit être confirmée explicitement une fois un
fournisseur choisi ([JOB-111](https://linear.app/jobs-boards/issue/JOB-111)
bloque le déploiement, qui bloque le provisionnement réel), pas assumée :

- **Supabase** : chiffrement au repos activé par défaut (AES-256) sur
  toutes les instances Postgres managées — à confirmer dans Project
  Settings → Database au moment du provisionnement.
- **Vercel Postgres (Neon)** : chiffrement au repos activé par défaut — à
  confirmer dans les paramètres du projet de la même façon.

Cette page sera mise à jour avec la confirmation explicite (capture ou
lien vers la doc du fournisseur retenu) une fois l'instance provisionnée.
