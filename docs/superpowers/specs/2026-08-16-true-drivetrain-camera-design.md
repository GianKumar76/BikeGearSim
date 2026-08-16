# Gemeinsame Drivetrain-Kameraprojektion

## Anlass

Die erste Perspektivkorrektur vereinheitlichte das Ellipsenverhältnis der Zahnkränze, beließ jedoch die Zentren von Kassette, Kurbel und Rahmen als voneinander unabhängige Bildschirmpositionen. Der Screenshot zeigt dadurch weiterhin eine Kassettenansicht, einen Kurbelkreis und Rahmenlinien ohne gemeinsame räumliche Ursache. Außerdem wird das 34er-Kettenblatt fast vollständig vom 50er-Blatt verdeckt.

## Ziel

Der gesamte Antrieb entsteht aus einem gemeinsamen dreidimensionalen Koordinatensystem und einer festen obliquen Kamera. Hintere Ritzel, beide Kettenblätter, Kette, Schaltwerk und Rahmen müssen in derselben Blickrichtung liegen. Das 34er-Blatt bleibt mit einem klaren sichtbaren Randabschnitt erkennbar, wenn das 50er-Blatt aktiv ist.

## Koordinatensystem und Kamera

Die reine Geometrieschicht verwendet die Weltachsen `longitudinal`, `vertical` und `axle`:

- `longitudinal` verläuft vom Hinterrad zum Tretlager und projiziert nach rechts sowie leicht nach oben.
- `vertical` projiziert senkrecht nach unten.
- `axle` beschreibt Kassette und Kettenblattstapel und projiziert nach rechts sowie leicht nach unten.

Eine einzige Funktion `projectPoint({ longitudinal, vertical, axle }, camera)` bildet jeden Weltpunkt auf Bildschirmkoordinaten ab. Sie verwendet für alle Antriebskomponenten dieselben drei Projektionsvektoren und denselben Ursprung. Der Canvas-Ellipsenwinkel wird aus dem projizierten Längsvektor abgeleitet; Ritzel und Kettenblätter sind daher gleich geneigt, statt als senkrechte Standardellipsen gezeichnet zu werden.

## Geometrie der Komponenten

### Anker und Rahmen

Hinterradachse, Tretlager und Sitzcluster erhalten Weltkoordinaten. Kettenstrebe, Sitzstrebe und Sitzrohr verbinden ausschließlich ihre projizierten Anker. Der bisherige harte Versatz einzelner Bildschirmkoordinaten wird entfernt.

### Kassette

Alle elf Ritzel liegen bei identischer `longitudinal`- und `vertical`-Koordinate. Ihre `axle`-Koordinate variiert in gleichmäßigen Schritten. Der Ritzelstapel wird von der größten hinteren Scheibe zur kleinsten vorderen Scheibe gezeichnet. Die Extrusion jedes Ritzels folgt ebenfalls dem projizierten Achsvektor.

### Kurbel

Beide Kettenblätter besitzen dieselben `longitudinal`- und `vertical`-Koordinaten wie das Tretlager und liegen auf unterschiedlichen `axle`-Koordinaten. Der Abstand beträgt mindestens 20 Bildschirm-Pixel bei einer Skalierung von 1. Dadurch bleibt bei der 50T-Ansicht ein linker Randbereich des 34T-Blatts sichtbar. Kurbelarm, Pedal und Kettenblatt-Extrusion folgen derselben Achsprojektion.

### Kette und Schaltwerk

Die aktiven Zahnkränze werden aus der neuen Projektionsgeometrie bezogen. Kettentangenten werden in den durch die neue Kamera erzeugten Ellipsen berechnet. Führungs- und Spannrolle leiten sich von diesen Tangenten ab. Die Kette darf keine separaten, festen Bildschirmanker verwenden.

## Lesbarkeit

- Der projizierte Längsvektor ist gegenüber der Bildschirmhorizontalen sichtbar geneigt.
- Das Verhältnis der kleinen zur großen Ellipsenachse bleibt für Kassette und Kettenblätter identisch.
- Alle Ritzel tragen unterscheidbare Außenkonturen.
- Das aktive Ritzel und das aktive Kettenblatt-Label werden zuletzt gezeichnet.
- Das HUD, die Schaltlogik, Zahnkombinationen und Presets bleiben unverändert.

## Verifikation

Automatisierte Tests prüfen, dass:

- `projectPoint` dieselben Projektionsvektoren für alle Komponenten nutzt,
- Hinterrad- und Tretlageranker auf dem projizierten Längsvektor liegen,
- aufeinanderfolgende Ritzel und Kettenblätter entlang des projizierten Achsvektors liegen,
- der Abstand zwischen 34T- und 50T-Blatt die definierte Mindesttiefe erreicht,
- alle Kettenanschlüsse auf den projizierten Zahnradellipsen liegen.

Die visuelle Abnahme bei 50×15, 34×30 und 50×11 prüft außerdem die gemeinsame Neigung, das sichtbare kleine Kettenblatt, die sichtbaren Ritzelstufen und einen plausiblen Kettenlauf.
