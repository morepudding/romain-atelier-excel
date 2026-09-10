# Maison Martin

Animation de présentation produit de 60 secondes, conçue pour être comprise sans son.

## Version conservée

Le fichier [releases/Maison-Martin_60s_Full-HD.mp4](releases/Maison-Martin_60s_Full-HD.mp4?raw=true) est exactement celui validé par Romain et servi localement le 10 septembre 2026. Il contient le mixage final, avec un gain de 14 dB appliqué à la piste synthétisée.

SHA-256 : `578259c8c4cc8f722e558272e0e3b808694c7d3f496ecaa702081b8b2b92c6dd`.

Contrôles de l’export : décodage complet réussi, 1 800 images, Full HD à 30 images/s, piste AAC et 120 images finales stables. Les plans principaux et les transferts ont été inspectés sur des images extraites du MP4. Le lecteur Windows n’a pas pu être piloté lors de cette vérification.

## Fichiers

- `render.mjs` : dessin et animation déterministes, puis encodage avec FFmpeg.
- `sound.py` : création locale de l’habillage sonore original.
- `verify.py` : contrôle du MP4 et extraction des images de vérification.
- `assets/` : les deux images de la même entrée fictive, réutilisées dans les sources et le compte rendu.
- `verification.json` : mesures et empreinte du fichier validé.
- `package-lock.json` : versions des dépendances du moteur graphique.

## Refaire un rendu sous Windows

Prévoir Node.js, Python avec NumPy, FFmpeg et les polices Windows Segoe UI, Segoe UI Light, Segoe UI Bold et Georgia. Les polices et les outils ne sont pas redistribués dans ce dépôt.

Depuis ce dossier, dans PowerShell :

```powershell
npm.cmd ci
python -m pip install numpy
# Facultatif si ffmpeg.exe est déjà dans le PATH :
$env:FFMPEG_PATH = 'C:\chemin\vers\ffmpeg.exe'
python sound.py
node render.mjs
python verify.py output/Maison-Martin_60s_Full-HD.mp4
```

Pour une inspection rapide : `node render.mjs stills 13.8 34 46 56`.

Les sorties de travail sont écrites dans `output/`, ignoré par Git. Le fichier validé dans `releases/` reste conservé. La copie des scripts archivée ici utilise un chemin FFmpeg configurable et applique le gain final pendant le rendu ; les images du film et son découpage sont ceux de la version validée.

## Découpage

| Temps | Séquence |
| --- | --- |
| 00–06 s | Retour de chantier : vocal, deux photos, mail fournisseur |
| 06–12 s | Modèle vide et clic sur « Préparer le compte rendu » |
| 12–23 s | Cloisons posées et transfert des deux photos |
| 23–30 s | Porte non reçue et action de confirmation de livraison |
| 30–41 s | JEUDI / VENDREDI : date laissée à confirmer |
| 41–53 s | Compte rendu en brouillon, puis sources et résultat |
| 53–60 s | Promesse et signature « r. » ; image fixe de 56 à 60 s |
