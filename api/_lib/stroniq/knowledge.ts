/**
 * Stroniq — approved knowledge base.
 *
 * The ONLY source of facts about Stronivo the assistant may use. Edit this file to change
 * what the agent knows (redeploy afterwards). Keep it factual: the assistant is instructed
 * to say "this has to be confirmed by the team" for anything that is not written here.
 *
 * Keep the text stable between deploys — it is part of the cached prompt prefix.
 */
export const KNOWLEDGE_BASE = `
# Stronivo — baza wiedzy (zatwierdzona)

## Kim jesteśmy
- Stronivo to studio projektujące i tworzące nowoczesne strony internetowe dla firm.
- Hasło marki: „Podłączamy Twoją firmę do internetu.”
- Strona: https://www.stronivo.com · e-mail: kontakt@stronivo.com
- Obszar działania podany na stronie: firmy z Żor i całego Śląska.
- „Małe studio. Wielkie pomysły.” Wierzymy, że profesjonalna obecność w internecie nie musi być zarezerwowana dla największych firm. Tworzymy nowoczesne, przemyślane strony, które łączą estetykę z funkcjonalnością. Stawiamy na indywidualne podejście, kreatywność i rozwiązania dopasowane do potrzeb każdego biznesu.
- Usługi pod marką Stronivo świadczy EASY BUSY Sp. z o.o., NIP 8961591928, ul. Hebanowa 43, 55-093 Kiełczów (dane prawne — podawaj tylko, gdy ktoś o nie pyta).

## Usługi (dokładnie te cztery)
1. Strony internetowe — szybkie, estetyczne i responsywne strony dopasowane do charakteru firmy. Zakres: projekt UI, responsywność, CMS na życzenie.
2. Landing page — strony nastawione na konkretny cel: kontakt, zapytania i pozyskiwanie klientów. Jeden cel, mocne CTA, formularze.
3. Odświeżanie stron — nowoczesny wygląd istniejących witryn i lepszy komfort użytkowania (redesign, UX, nowa typografia).
4. SEO i optymalizacja — techniczne podstawy widoczności w wyszukiwarkach, szybkość działania i prawidłowe wyświetlanie na urządzeniach (Core Web Vitals, meta i Open Graph, dostępność).

## Dla kogo (z treści strony)
Małe firmy usługowe, restauracje i kawiarnie oraz firmy, którym zależy, żeby klienci z okolicy łatwo znaleźli je w internecie. Dla lokalnych klientów ważne są: przejrzysta oferta, aktualne dane kontaktowe i strona, która szybko działa na telefonie.

## Proces współpracy (4 etapy)
1. Rozmowa — poznajemy firmę, cele i oczekiwania.
2. Projekt — koncepcja wizualna dopasowana do marki.
3. Realizacja — budowa strony, dopracowanie szczegółów, testy.
4. Publikacja — uruchomienie witryny i pomoc w rozpoczęciu jej funkcjonowania w internecie.

## Przykłady (projekty demonstracyjne — NIE są to realizacje dla klientów)
- Easy Busy — budownictwo / roboty ziemne: https://easybusy.lovable.app
- Bella Italia — gastronomia / restauracja: https://bellaitaliaweb.lovable.app
Zawsze nazywaj je „projektami demonstracyjnymi”.

## Kontakt z zespołem (człowiekiem)
- E-mail: kontakt@stronivo.com
- Formularz kontaktowy na stronie: https://www.stronivo.com/#kontakt
- Media: Instagram (stronivowebs), TikTok (@stronivo), Facebook (Stronivo).

## NIE jest potwierdzone — nie podawaj żadnych liczb ani obietnic
- Ceny i widełki cenowe, rabaty, promocje, raty.
- Terminy realizacji, czas odpowiedzi zespołu, dostępność.
- Gwarancje (wyników SEO, pozycji w Google, liczby klientów itp.).
- Hosting, domeny, abonamenty, opieka techniczna po publikacji, liczba poprawek, konkretne systemy CMS, sklepy internetowe — to trzeba ustalić z zespołem.
- Opinie klientów, liczby realizacji, nagrody — nie istnieją w bazie wiedzy, nie wspominaj o nich.
Cena zawsze zależy od zakresu projektu — zaproponuj przygotowanie indywidualnej wyceny przez zespół po zebraniu potrzeb.

## Ogólna wiedza, którą możesz wykorzystać do doradzania (bez obietnic w imieniu Stronivo)
- Landing page: jedna strona, jeden cel (np. zapytania o usługę, kampania, nowy produkt); szybka do uruchomienia.
- Strona firmowa: kilka podstron (o firmie, oferta, realizacje, kontakt); buduje wiarygodność i widoczność.
- Strona restauracji / kawiarni: menu, zdjęcia, godziny otwarcia, dojazd, rezerwacja lub telefon „jednym kliknięciem”.
- Portfolio: prezentacja prac (fotograf, architekt, twórca), galeria, opis podejścia, kontakt.
- Odświeżenie strony: gdy strona jest przestarzała, wolna albo źle wygląda na telefonie.
`.trim()
