# Catan Runde · Ein Handy für den ganzen Tisch

https://urvaterchristus.github.io/catan-runde/

Version 0.6.0: Ohne Anmeldung und ohne laufende Kosten.

1. Neue Partie anlegen und 2 bis 4 Spielernamen eingeben.
2. Bei jedem Spieler „Werte eintragen“ wählen und dessen Endstand erfassen.
3. Jede Eingabe abschließen, anschließend die Partie unter „Prüfen“ bestätigen.
4. „Statistiken“ zeigt Spiele, Siege, Siegquote, durchschnittliche und beste Siegpunkte je Spieler.

Nur bestätigte Partien zählen in der Statistik. Gleichstände zählen für alle Sieger. Die Zuordnung erfolgt nach Namen; bitte dieselbe Schreibweise für dieselbe Person verwenden. Groß-/Kleinschreibung wird ignoriert.

## Handy und Offline
Nach einmaligem vollständigem Laden im Internet ist die App offline verfügbar. Auf iPhone: Safari → Teilen → Zum Home-Bildschirm. Android: Browsermenü → App installieren. Bei bestehender Installation „Update laden“ antippen.

Alle neuen Spiele liegen lokal auf diesem Gerät. Regelmäßig „Sicherung exportieren“ verwenden. Die JSON-Datei kann auf einem anderen Gerät über „Sicherung importieren“ eingelesen werden. Vorhandene Spiele werden nicht still überschrieben. Keine automatische Synchronisierung zwischen Geräten.

Die bisherigen Probelauf- und Supabase-Daten werden nicht gelöscht. Die neue lokale Erfassung verwendet einen separaten Speicher ohne automatisch erzeugte Demo-Spiele. Die frühere gemeinsame Ansicht ist unter ./shared.html aufrufbar; Anmeldung und Mehrgerätebetrieb sind derzeit zurückgestellt.

## Bisherige PC-Spiele
„JSON / PC-Spiele importieren“ akzeptiert auch die originale catan_spielstaende.json des PC-Programms. Auf iPhone kann sie über die Dateiauswahl aus OneDrive gewählt werden. Die Spiele werden lokal importiert; es werden keine Daten an GitHub gesendet. Bestehende unveränderte Partien werden beim erneuten Import nicht doppelt angelegt. Änderungen an alten PC-Partien sind noch kein unterstützter Synchronisationsweg.

Importierte PC-Partien behalten Originalfelder, gespeicherte Sieger und berechnete Punkte; bis zu sechs Teilnehmer werden gelesen. Die Statistik zeigt bestätigte Endstände. Neue Partien unterstützen weiterhin zwei bis vier Spieler. Originaldaten werden nicht überschrieben.

OneDrive-Synchronisierung ist noch nicht aktiv. Die Einrichtung der Microsoft-App-Verbindung ist durch fehlenden Zugriff auf die App-Verwaltung des Uni-Kontos blockiert. Dateiimport ist eine lokale Übernahme, kein automatischer Abgleich mit dem PC.

## Manueller OneDrive-Dateiabgleich (Version 0.6.2)
Die direkte Microsoft-Verbindung ist nicht aktiviert. Stattdessen:
1. Am PC die vorbereitete PC-Version benutzen, „Dateiabgleich“ wählen und catan_abgleich.json im gewünschten OneDrive-Ordner anlegen/auswählen. Nicht dieselbe Datei wie catan_spielstaende.json auswählen.
2. Warten, bis OneDrive den Upload abgeschlossen hat.
3. Auf dem iPhone „OneDrive-Datei abgleichen“ wählen und die aktuelle catan_abgleich.json über „Dateien“/OneDrive auswählen.
4. Anschließend „Abgleichdatei speichern“, die Datei über „In Dateien sichern“ wieder im selben OneDrive-Ordner als catan_abgleich.json speichern und die bisherige Abgleichdatei ersetzen. Vorherige Sicherungen aufbewahren.
5. Nach abgeschlossenem OneDrive-Upload am PC erneut „Dateiabgleich“ durchführen. Neue Spiele von beiden Seiten sind danach zusammengeführt.

Nur abgeschlossene Partien werden übertragen. Änderungen derselben Partie verlangen eine bewusste Versionsauswahl. Löschungen werden ausschließlich im PC-Programm ausgelöst und als Löschkennungen beim Dateiabgleich übertragen. Alte Abgleichdateien können gelöschte Partien nicht wieder hinzufügen. Die PC-Version 0.6.2 und ihre separate .deletions.json-Datei sind dafür erforderlich. Abgleichdateien verwenden jetzt das Format catan-exchange-v2; alte reine Spielelisten können weiterhin eingelesen werden. Während des Abgleichs nicht gleichzeitig auf dem anderen Gerät bearbeiten. Immer die aktuelle Datei abgleichen, bevor eine neue Abgleichdatei exportiert wird. Der Browser kann nicht prüfen, ob du die heruntergeladene Datei tatsächlich in OneDrive gespeichert hast.
Die neue PC-Version muss nach dem ersten Abgleich die bisherige Version für weitere Bearbeitung ersetzen, damit dauerhafte Spielkennungen bei Änderungen erhalten bleiben.
