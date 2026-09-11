# Catan Runde

Private Spielrunde auf mehreren Handys: https://urvaterchristus.github.io/catan-runde/

## Gemeinsam spielen
1. Auf jedem Handy die App öffnen und „Als Gast mitspielen“ wählen.
2. Die Spielleitung erstellt eine Partie mit den Namen aller Spieler.
3. „Spieler einladen“ öffnen und den Link mit den Mitspielern teilen.
4. Jeder wählt seinen freien Platz und trägt nur seine eigenen Werte ein.
5. Die Spielleitung prüft die Werte und bestätigt die Partie.

Gastzugänge bleiben auf demselben Browser gespeichert. Abmelden, Browserdaten löschen oder ein anderes Gerät verwenden erlaubt keine Wiederherstellung des Gastzugangs. Der Beitrittslink ist kein Wiederherstellungsschlüssel für bereits belegte Plätze.

Feste Konten: E-Mail-Link ist im Code vorbereitet, aber bis zur Einrichtung eines eigenen SMTP-Versands deaktiviert. Es wird kein Passwort benötigt.

## Offline
Nach dem ersten vollständigen Laden ist die App offline verfügbar. Bereits geladene Partien und eigene Entwürfe bleiben auf dem Gerät. Anmeldung, Einladungen und Bestätigung benötigen Internet. Abgeschlossene Offline-Eingaben werden beim nächsten Öffnen mit Internet bzw. beim Wiederverbinden übertragen. Bei widersprüchlichen Änderungen muss der Spieler den Serverstand prüfen und seinen Entwurf erneut freigeben.

## Daten
GitHub enthält den App-Code und einen öffentlichen Supabase-Projektschlüssel. Gemeinsame Partien liegen in Supabase. Zeilenzugriffsregeln beschränken das Lesen auf Teilnehmer. Änderungen laufen ausschließlich über geprüfte Datenbankfunktionen; Adminschlüssel und SMTP-Zugangsdaten gehören niemals ins Repository.

## Installation
Safari auf iPhone: Teilen → Zum Home-Bildschirm.
Android: Browsermenü → App installieren / Zum Startbildschirm hinzufügen.
Bei vorhandener Installation „Update laden“ verwenden.

Version 0.4.0

## Persönliches Konto und Meine Spiele
Die E-Mail-Anmeldung ist der vorgesehene Weg für feste Spieler: Beim ersten Anmeldelink entsteht das Konto, spätere Anmeldungen führen zum selben persönlichen Archiv. Der Mailversand ist noch nicht aktiv.
„Meine Spiele“ listet alle eigenen Teilnahmen mit offenen und abgeschlossenen Partien, Mitspielern und eigenem Ergebnis. Namen allein gewähren keinen Zugriff. Vorhandene Gastzugänge können nach Aktivierung des Mailversands mit einer neuen E-Mail-Adresse verknüpft werden; bereits getrennte Konten werden nicht automatisch zusammengeführt.
