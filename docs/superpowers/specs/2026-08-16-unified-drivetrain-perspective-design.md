# Einheitliche Drivetrain-Perspektive

## Ziel

Die Drivetrain-Darstellung erhält eine räumlich konsistente, stark seitliche Perspektive. Kassette, beide vorderen Kettenblätter, Rahmen und Kette sollen wie Teile desselben Antriebs wirken. Trotz der tiefen Blickrichtung müssen die elf hinteren Ritzel und beide vorderen Kettenblätter als getrennte Bauteile erkennbar bleiben.

## Gewählte visuelle Richtung

Aus drei verglichenen Varianten wurde **C – Tief** gewählt. Diese Variante priorisiert eine ausgeprägte räumliche Tiefe und zeigt die Zahnkränze als schmale Ellipsen. Die geringere sichtbare Fläche wird durch klare Tiefenabstände, kontrastreiche Kanten und eine kontrollierte Zeichenreihenfolge ausgeglichen.

## Projektionsmodell

Der Renderer verwendet eine zentrale Projektionskonfiguration für den gesamten Antrieb:

- Eine gemeinsame Scheibenebene legt das Ellipsenverhältnis aller Ritzel und Kettenblätter auf `0,30` horizontal zu `1,00` vertikal fest.
- Ein gemeinsamer projizierter Tiefenvektor bestimmt die Versätze innerhalb der Kassette und zwischen den beiden Kettenblättern. Er zeigt auf dem Bildschirm nach rechts und leicht nach unten; alle Bauteile verwenden exakt denselben normierten Vektor.
- Hinterradachse und Tretlager werden als Weltanker behandelt. Ihre Bildschirmpositionen bilden die gemeinsame Längsrichtung des Antriebs.
- Rahmenpunkte und Kettenpunkte werden aus denselben Ankern beziehungsweise Projektionsparametern abgeleitet.

Die Darstellung bleibt eine performante Canvas-Projektion; eine vollständige 3D-Engine wird nicht eingeführt.

Die reine Geometrieberechnung wird aus den Zeichenfunktionen herausgelöst. Sie nimmt Canvas-Abmessungen, Skalierung und Gangdaten entgegen und liefert projizierte Anker, Zahnradmittelpunkte, Radien und Kettenpunkte. Der Canvas-Renderer zeichnet ausschließlich diese berechneten Werte. Ungültige oder noch nicht messbare Canvas-Größen werden wie bisher ohne Zeichnung beendet.

## Bauteilgeometrie

### Kassette

Die elf Ritzel teilen dieselbe Orientierung. Ihre Radien bleiben vom Zahnwert abhängig. Jedes Ritzel wird ausschließlich entlang des gemeinsamen Tiefenvektors versetzt, sodass der Ritzelstapel eine eindeutige Achse besitzt. Die Staffelung bleibt groß genug, um einzelne Ritzel zu unterscheiden.

Im Zielzustand müssen im vorhandenen Desktop-Layout ab 1280 Pixel Viewport-Breite alle elf Außenkonturen als einzelne Stufen erkennbar sein; keine zwei benachbarten Ritzel dürfen denselben projizierten Mittelpunkt erhalten.

### Kettenblätter

Das 34er- und das 50er-Kettenblatt verwenden dasselbe Ellipsenverhältnis und dieselbe Ebenennormale wie die Kassette. Ihr Abstand folgt ebenfalls dem Tiefenvektor. Konturen und Überdeckung werden so gezeichnet, dass der Rand des kleineren Blatts sichtbar bleibt.

Mindestens ein zusammenhängender Randabschnitt des 34er-Blatts bleibt auch dann sichtbar, wenn das 50er-Blatt aktiv ist.

### Kette und Schaltwerk

Die oberen und unteren Kettenstränge verbinden geometrisch abgeleitete Randpunkte der aktiven Zahnräder. Die Umschlingungsbögen verwenden dieselbe projizierte Ellipsengeometrie wie die Zahnräder. Das Schaltwerk bleibt an das aktive Ritzel gekoppelt und folgt dessen projizierter Position.

### Rahmen

Kettenstrebe, Sitzstrebe und Sitzrohr verwenden dieselben projizierten Anker. Dadurch widersprechen ihre Fluchtlinien nicht mehr der Perspektive des Antriebs.

## Lesbarkeit und Zeichenreihenfolge

- Nicht aktive Ritzel und Kettenblätter bleiben durch abgestufte Kantenfarben sichtbar.
- Aktive Zahnräder und Kette behalten die vorhandene türkisfarbene Hervorhebung.
- Hintere Elemente werden vor vorderen Elementen gezeichnet.
- Beschriftungen folgen den projizierten Bauteilpositionen. Die aktive Zahnzahl bleibt vollständig lesbar und wird nicht von einer anderen Zahnzahl überzeichnet.
- Der vorhandene großzügige Abstand zwischen Kassette und Kurbel bleibt erhalten.

## Nicht im Umfang

- Keine Änderung der Schalt-, Physik- oder Bewertungslogik
- Keine Änderung der Zahnkombinationen oder Presets
- Keine neue 3D-Bibliothek
- Keine Neugestaltung des HUD oder der übrigen Oberfläche

## Verifikation

Automatisierte Geometrietests prüfen:

- identische Ellipsenorientierung für Kassette und Kettenblätter,
- kollineare Tiefenversätze aller parallelen Zahnkränze,
- korrekte Größenreihenfolge der Ritzel und Kettenblätter,
- Kettenanschlüsse auf den projizierten Rändern der aktiven Zahnräder.

Zusätzlich wird die Anwendung im Browser bei mehreren Gangkombinationen visuell geprüft. Dabei müssen die gemeinsame Perspektive, die Sichtbarkeit aller elf Ritzel, die Unterscheidbarkeit beider Kettenblätter und ein plausibler Kettenlauf erkennbar sein.
