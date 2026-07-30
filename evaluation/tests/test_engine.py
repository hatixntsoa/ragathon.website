from scoring.engine import similarity_score, classify_zone, Zone

cases = [
    (
        "Les téléphones sont interdits en examen.",
        "Non, les téléphones sont interdits en examen.",
        Zone.PASS,
    ),
    ("Quelle est la durée de la pause ?", "Il y a un impôt sur le revenu.", Zone.FAIL),
    (
        "Quel est l'horaire des cours ?",
        "Les cours commencent en général le matin.",
        Zone.GRAY,
    ),
]

for expected, generated, expected_zone in cases:
    score = similarity_score(expected, generated)
    zone = classify_zone(score)
    status = "OK" if zone == expected_zone else "MISMATCH"
    print(
        f"[{status}] score={score:.3f} zone={zone.value} expected={expected_zone.value}"
    )
