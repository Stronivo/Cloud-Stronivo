/**
 * Legal documents (Polish only — legally binding version).
 * They describe how this store actually works. Seller data comes from VITE_COMPANY_*.
 * IMPORTANT: have them reviewed by a lawyer before launch. While company data is
 * missing, the page shows a visible "document in preparation" banner.
 */
import { COMPANY, CONTACT } from './site'

const seller = () =>
  COMPANY.name
    ? `${COMPANY.name}${COMPANY.address ? `, ${COMPANY.address}` : ''}${COMPANY.nip ? `, NIP ${COMPANY.nip}` : ''}`
    : '[dane sprzedawcy do uzupełnienia]'
const email = () => CONTACT.email || '[adres e-mail do uzupełnienia]'

export type LegalDoc = { title: string; sections: { id?: string; heading: string; paragraphs: string[] }[] }

export const terms = (): LegalDoc => ({
  title: 'Regulamin sklepu EnglishPocket',
  sections: [
    {
      heading: '1. Sprzedawca',
      paragraphs: [`Sklep internetowy EnglishPocket prowadzi: ${seller()}. Kontakt: ${email()}.`],
    },
    {
      heading: '2. Przedmiot sprzedaży',
      paragraphs: [
        'Sklep sprzedaje treści cyfrowe — materiały edukacyjne do nauki języka angielskiego w formacie PDF, dostarczane wyłącznie w formie elektronicznej (bez nośnika materialnego).',
        'Opis, zakres i cena każdego pakietu są podane na stronie produktu. Ceny są cenami brutto.',
      ],
    },
    {
      heading: '3. Zamówienie i płatność',
      paragraphs: [
        'Zamówienie składa się, dodając materiały do koszyka i przechodząc do płatności. Płatności obsługuje Stripe; sprzedawca nie przetwarza ani nie przechowuje danych kart płatniczych.',
        'Umowa zostaje zawarta z chwilą potwierdzenia płatności przez operatora płatności.',
      ],
    },
    {
      id: 'produkty-cyfrowe',
      heading: '4. Dostarczenie produktów cyfrowych',
      paragraphs: [
        'Po potwierdzeniu płatności kupujący otrzymuje na adres e-mail podany w trakcie płatności wiadomość z indywidualnymi linkami do pobrania plików PDF. Linki są dostępne także na stronie potwierdzenia zamówienia.',
        'Linki do pobrania są ważne przez okres i dla liczby pobrań wskazanych w wiadomości e-mail. Po ich wygaśnięciu kupujący może zwrócić się do sprzedawcy o ponowne udostępnienie materiałów.',
        'Do korzystania z materiałów potrzebne jest urządzenie z programem do odczytu plików PDF. Materiały można wydrukować na własny użytek.',
      ],
    },
    {
      heading: '5. Prawo odstąpienia od umowy',
      paragraphs: [
        'Konsumentowi przysługuje co do zasady prawo odstąpienia od umowy zawartej na odległość w terminie 14 dni.',
        'Zgodnie z art. 38 ust. 1 pkt 13 ustawy z dnia 30 maja 2014 r. o prawach konsumenta prawo to nie przysługuje w odniesieniu do umowy o dostarczanie treści cyfrowych niedostarczanych na nośniku materialnym, jeżeli spełnianie świadczenia rozpoczęło się za wyraźną i uprzednią zgodą konsumenta przed upływem terminu do odstąpienia od umowy i po poinformowaniu go przez przedsiębiorcę o utracie prawa odstąpienia. Zgodę tę kupujący wyraża, zaznaczając odpowiednie pole w koszyku przed przejściem do płatności.',
      ],
    },
    {
      heading: '6. Licencja',
      paragraphs: [
        'Materiały są przeznaczone do osobistego użytku kupującego. Dalsze udostępnianie, odsprzedaż lub publikowanie materiałów bez zgody sprzedawcy jest niedozwolone.',
      ],
    },
    {
      heading: '7. Reklamacje',
      paragraphs: [
        `Reklamacje dotyczące materiałów lub działania linków można zgłaszać na adres ${email()}. Odpowiadamy w terminie 14 dni.`,
      ],
    },
    {
      heading: '8. Dane osobowe',
      paragraphs: ['Zasady przetwarzania danych osobowych opisuje Polityka prywatności.'],
    },
  ],
})

export const privacy = (): LegalDoc => ({
  title: 'Polityka prywatności',
  sections: [
    { heading: '1. Administrator danych', paragraphs: [`Administratorem danych osobowych jest ${seller()}. Kontakt: ${email()}.`] },
    {
      heading: '2. Jakie dane przetwarzamy i po co',
      paragraphs: [
        'Zamówienia: adres e-mail i dane zamówienia (kupione materiały, kwota, status płatności) — w celu realizacji umowy i dostarczenia plików (art. 6 ust. 1 lit. b RODO) oraz wypełnienia obowiązków podatkowych i rachunkowych (art. 6 ust. 1 lit. c RODO).',
        'Formularz kontaktowy: imię, adres e-mail i treść wiadomości — w celu odpowiedzi na wiadomość (art. 6 ust. 1 lit. f RODO).',
      ],
    },
    {
      heading: '3. Odbiorcy danych',
      paragraphs: [
        'Stripe — obsługa płatności; Supabase — przechowywanie danych zamówień i plików; Resend — wysyłka wiadomości e-mail; Vercel — hosting strony. Dostawcy ci przetwarzają dane w naszym imieniu lub jako odrębni administratorzy (operator płatności).',
      ],
    },
    {
      heading: '4. Okres przechowywania',
      paragraphs: [
        'Dane zamówień przechowujemy przez okres wymagany przepisami podatkowymi i rachunkowymi oraz do czasu przedawnienia ewentualnych roszczeń. Wiadomości z formularza — do czasu zakończenia korespondencji.',
      ],
    },
    {
      heading: '5. Twoje prawa',
      paragraphs: [
        'Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia danych oraz wniesienia sprzeciwu, a także prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych.',
      ],
    },
    {
      heading: '6. Pamięć przeglądarki',
      paragraphs: [
        'Strona zapisuje w pamięci Twojej przeglądarki (localStorage) wyłącznie zawartość koszyka i wybrany język strony. Nie używamy plików cookies analitycznych ani reklamowych.',
      ],
    },
  ],
})
