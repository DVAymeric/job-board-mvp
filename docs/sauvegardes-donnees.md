# Sauvegardes de la base de données (JOB-87)

## Politique de rétention — à activer au provisionnement, pas encore active

**Non encore activable** : aucune instance Postgres managée n'est
provisionnée à ce jour (voir aussi
[`docs/chiffrement-donnees.md`](chiffrement-donnees.md), même situation) —
le code utilise le provider `postgresql`, mais l'environnement réel tourne
encore sur le Postgres local docker-compose. La politique ci-dessous est
celle à activer et confirmer une fois un fournisseur choisi et l'instance
de production provisionnée ([JOB-111](https://linear.app/jobs-boards/issue/JOB-111)
bloque encore ce provisionnement) :

- **Supabase** : Point-in-Time Recovery (PITR) — sauvegardes continues,
  restauration à n'importe quelle seconde sur la fenêtre de rétention du
  plan (7 jours en Pro par défaut, extensible). À activer dans Project
  Settings → Database → Backups au moment du provisionnement.
- **Vercel Postgres (Neon)** : sauvegardes automatiques quotidiennes +
  branches de restauration point-in-time selon le plan. À confirmer dans
  les paramètres du projet.

À mettre à jour avec la fréquence et la durée de rétention réellement
activées une fois l'instance provisionnée.

## Procédure de restauration — mécanique testée le 14 août 2026

Le fournisseur managé n'existant pas encore, sa procédure de restauration
réelle (PITR via dashboard) n'est pas testable maintenant. Ce qui est testé
ici, c'est la **mécanique** dump/restore Postgres standard — la même que
celle qu'utilisent ces fournisseurs sous le capot, et le filet de secours
applicable quel que soit le fournisseur retenu.

Drill effectué contre le Postgres local (docker-compose) :

```bash
# 1. Dump de la base courante (format custom, compressé)
docker compose exec -T postgres pg_dump -U jobtracker -Fc jobtracker > backup.dump

# 2. Base de restauration séparée (jamais restaurer par-dessus le prod existant
#    sans détour — même en drill, sans quoi une régression du dump écrase les
#    données réelles avant qu'on ait pu la détecter)
docker compose exec -T postgres psql -U jobtracker -d postgres -c "CREATE DATABASE restore_drill;"

# 3. Restauration
docker compose exec -T postgres pg_restore -U jobtracker -d restore_drill \
  --no-owner --no-privileges backup.dump

# 4. Vérification d'intégrité : comparer les comptages avec la base source
docker compose exec -T postgres psql -U jobtracker -d restore_drill -c 'SELECT count(*) FROM "User";'
docker compose exec -T postgres psql -U jobtracker -d restore_drill -c 'SELECT count(*) FROM "Job";'
```

**Résultat** : comptages identiques entre la base source et `restore_drill`
(2 utilisateurs, 1 candidature au moment du drill) — restauration
intègre. Base `restore_drill` et fichier `backup.dump` supprimés après
vérification.

## Ce qui reste à faire une fois l'instance provisionnée

- Confirmer/activer la politique de rétention réelle chez le fournisseur
  retenu (section ci-dessus).
- Rejouer ce même drill contre un dump réel de l'instance de prod (ou une
  restauration PITR test) pour valider la procédure fournisseur elle-même,
  pas seulement la mécanique Postgres générique.
