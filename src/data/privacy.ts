/** Privacy policy text supplied by Stronivo (12 November 2026; §13 AI assistant added 13 November 2026). Edit here to update the page. */

export type Block =
  | { p: string }
  | { ol: string[] }
  | { ul: string[] }
  | { h: string; p: string; basis: string }

export type PolicySection = { no: string; title: string; blocks: Block[] }

export const PRIVACY_UPDATED = '13 listopada 2026 r.'
export const PRIVACY_UPDATED_ISO = '2026-11-13'

export const PRIVACY: PolicySection[] = [
  {
    no: '§1',
    title: 'Postanowienia ogólne',
    blocks: [
      {
        ol: [
          'Niniejsza Polityka Prywatności określa zasady zbierania, przetwarzania i ochrony danych osobowych użytkowników strony internetowej https://stronivo.com, działającej pod marką Stronivo.',
          'Stronivo jest marką specjalizującą się w projektowaniu, tworzeniu i wdrażaniu stron internetowych oraz świadczeniu powiązanych usług cyfrowych.',
          'Usługi oferowane pod marką Stronivo są świadczone w ramach działalności gospodarczej prowadzonej przez EASY BUSY SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ, NIP: 8961591928, adres: ul. Hebanowa 43, 55-093 Kiełczów.',
          'Administratorem danych osobowych jest wskazany powyżej przedsiębiorca, o ile faktycznie decyduje o celach i sposobach przetwarzania danych.',
          'Kontakt z administratorem możliwy jest pod adresem e-mail: kontakt@stronivo.com.',
          'Dane osobowe przetwarzane są zgodnie z obowiązującymi przepisami, w szczególności Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 (RODO).',
        ],
      },
    ],
  },
  {
    no: '§2',
    title: 'Zakres przetwarzanych danych',
    blocks: [
      { p: 'W związku z korzystaniem ze strony internetowej Stronivo mogą być przetwarzane następujące dane:' },
      {
        ul: [
          'Imię i nazwisko użytkownika.',
          'Adres poczty elektronicznej.',
          'Numer telefonu, jeżeli został dobrowolnie podany.',
          'Nazwa firmy oraz dane związane z prowadzoną działalnością.',
          'Informacje zawarte w wiadomościach przesyłanych przez formularz kontaktowy lub pocztę elektroniczną.',
          'Adres IP oraz podstawowe informacje techniczne dotyczące urządzenia, przeglądarki i korzystania ze strony.',
          'Dane niezbędne do przygotowania oferty, zawarcia i realizacji umowy.',
        ],
      },
      {
        p: 'Podanie danych osobowych jest dobrowolne, jednak w niektórych przypadkach niezbędne do obsługi zapytania lub realizacji zamówionej usługi.',
      },
    ],
  },
  {
    no: '§3',
    title: 'Cele i podstawy prawne przetwarzania danych',
    blocks: [
      { p: 'Dane osobowe mogą być przetwarzane w następujących celach:' },
      {
        h: '1. Obsługa zapytań i kontakt z użytkownikami',
        p: 'W celu udzielania odpowiedzi na wiadomości przesłane za pośrednictwem formularza kontaktowego, poczty elektronicznej lub innych dostępnych kanałów komunikacji.',
        basis: 'art. 6 ust. 1 lit. f RODO – prawnie uzasadniony interes administratora polegający na prowadzeniu korespondencji.',
      },
      {
        h: '2. Przygotowanie ofert i realizacja usług',
        p: 'W celu przedstawienia oferty, zawarcia umowy oraz realizacji usług związanych z tworzeniem i obsługą stron internetowych.',
        basis: 'art. 6 ust. 1 lit. b RODO – działania podejmowane przed zawarciem umowy oraz wykonanie umowy.',
      },
      {
        h: '3. Realizacja obowiązków prawnych',
        p: 'W szczególności w zakresie prowadzenia dokumentacji księgowej, wystawiania faktur i realizacji obowiązków podatkowych.',
        basis: 'art. 6 ust. 1 lit. c RODO.',
      },
      {
        h: '4. Zapewnienie bezpieczeństwa strony internetowej',
        p: 'W celu zapobiegania nadużyciom, ochrony infrastruktury technicznej i zapewnienia prawidłowego funkcjonowania witryny.',
        basis: 'art. 6 ust. 1 lit. f RODO.',
      },
      {
        h: '5. Ustalanie, dochodzenie i obrona roszczeń',
        p: 'W celu ochrony praw i interesów administratora.',
        basis: 'art. 6 ust. 1 lit. f RODO.',
      },
    ],
  },
  {
    no: '§4',
    title: 'Formularz kontaktowy i komunikacja',
    blocks: [
      {
        ol: [
          'Użytkownicy mogą kontaktować się ze Stronivo za pomocą formularza kontaktowego, poczty elektronicznej oraz dostępnych kanałów społecznościowych.',
          'Dane przekazywane podczas kontaktu wykorzystywane są do udzielenia odpowiedzi, przedstawienia oferty lub realizacji usług.',
          'Administrator nie wykorzystuje danych kontaktowych do wysyłania niezamówionych informacji handlowych.',
          'Dane nie są sprzedawane podmiotom trzecim.',
          'Korespondencja może być przechowywana przez okres niezbędny do obsługi zapytania i ochrony uzasadnionych interesów administratora.',
        ],
      },
    ],
  },
  {
    no: '§5',
    title: 'Pliki cookies',
    blocks: [
      {
        ol: [
          'Strona internetowa Stronivo może wykorzystywać pliki cookies oraz podobne technologie.',
          'Pliki cookies mogą służyć zapewnieniu prawidłowego funkcjonowania strony, utrzymaniu preferencji użytkownika oraz bezpieczeństwu witryny.',
          'Jeżeli na stronie wykorzystywane będą opcjonalne narzędzia analityczne lub marketingowe wymagające zgody, zostaną uruchomione dopiero po uzyskaniu odpowiedniej zgody użytkownika.',
          'Użytkownik może zarządzać plikami cookies za pomocą ustawień swojej przeglądarki oraz mechanizmu zarządzania zgodami, jeżeli został wdrożony.',
          'Wyłączenie niektórych plików cookies może wpłynąć na działanie wybranych funkcjonalności strony.',
        ],
      },
    ],
  },
  {
    no: '§6',
    title: 'Hosting i dostawcy usług technologicznych',
    blocks: [
      {
        ol: [
          'Strona Stronivo korzysta z zewnętrznych usług technologicznych niezbędnych do jej publikowania, utrzymania i obsługi.',
          'Hosting strony może być realizowany za pośrednictwem platformy Vercel.',
          'W związku z korzystaniem ze strony dostawca hostingu może przetwarzać dane techniczne, takie jak adres IP, informacje o żądaniach sieciowych i przeglądarce.',
          'Obsługa poczty elektronicznej i formularzy kontaktowych może odbywać się za pośrednictwem zewnętrznych dostawców usług.',
          'Dostawcy przetwarzają dane zgodnie z właściwymi umowami, zasadami ochrony danych oraz obowiązującymi przepisami.',
        ],
      },
    ],
  },
  {
    no: '§7',
    title: 'Odbiorcy danych osobowych',
    blocks: [
      {
        p: 'Dane osobowe mogą być udostępniane podmiotom wspierającym działalność administratora, w zakresie niezbędnym do realizacji określonych celów, w szczególności:',
      },
      {
        ul: [
          'Dostawcom hostingu i infrastruktury informatycznej.',
          'Dostawcom usług poczty elektronicznej.',
          'Dostawcom systemów obsługi formularzy kontaktowych.',
          'Podmiotom świadczącym usługi księgowe.',
          'Dostawcom usług informatycznych i technicznych.',
          'Uprawnionym organom publicznym, gdy wymagają tego przepisy prawa.',
        ],
      },
      { p: 'Dane nie są sprzedawane podmiotom trzecim.' },
    ],
  },
  {
    no: '§8',
    title: 'Przekazywanie danych poza Europejski Obszar Gospodarczy',
    blocks: [
      {
        ol: [
          'W związku z korzystaniem z usług zewnętrznych dostawców technologicznych dane osobowe mogą być przekazywane poza Europejski Obszar Gospodarczy.',
          'W takich przypadkach administrator zapewnia odpowiednią podstawę prawną przekazywania danych oraz zabezpieczenia wymagane przez RODO, np. decyzję stwierdzającą odpowiedni stopień ochrony lub standardowe klauzule umowne.',
          'Informacje o stosowanych zabezpieczeniach można uzyskać, kontaktując się z administratorem.',
        ],
      },
    ],
  },
  {
    no: '§9',
    title: 'Okres przechowywania danych',
    blocks: [
      {
        ol: [
          'Dane osobowe są przechowywane przez okres niezbędny do realizacji celów, w których zostały zebrane.',
          'Dane związane z korespondencją przechowywane są przez czas niezbędny do obsługi zapytania, a następnie przez okres uzasadniony ewentualnymi roszczeniami.',
          'Dane związane z realizacją umów przechowywane są przez okres obowiązywania umowy oraz odpowiedni okres przedawnienia roszczeń.',
          'Dane związane z obowiązkami księgowymi i podatkowymi przechowywane są zgodnie z obowiązującymi przepisami.',
          'Po upływie odpowiednich okresów dane są usuwane lub anonimizowane, chyba że istnieje inna podstawa prawna ich dalszego przetwarzania.',
        ],
      },
    ],
  },
  {
    no: '§10',
    title: 'Prawa osób, których dane dotyczą',
    blocks: [
      { p: 'Zgodnie z RODO użytkownikowi przysługują, w przypadkach określonych przepisami, następujące prawa:' },
      {
        ol: [
          'Prawo dostępu do danych osobowych.',
          'Prawo do sprostowania danych.',
          'Prawo do usunięcia danych.',
          'Prawo do ograniczenia przetwarzania.',
          'Prawo do przenoszenia danych.',
          'Prawo wniesienia sprzeciwu wobec przetwarzania danych.',
          'Prawo do cofnięcia zgody w dowolnym momencie, jeżeli przetwarzanie odbywa się na jej podstawie, bez wpływu na zgodność z prawem wcześniejszego przetwarzania.',
        ],
      },
      { p: 'W celu skorzystania z przysługujących praw należy wysłać wiadomość na adres: kontakt@stronivo.com' },
      { p: 'Użytkownik ma również prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO).' },
    ],
  },
  {
    no: '§11',
    title: 'Bezpieczeństwo danych',
    blocks: [
      {
        ol: [
          'Administrator stosuje odpowiednie środki techniczne i organizacyjne w celu ochrony danych osobowych.',
          'Środki bezpieczeństwa obejmują w szczególności kontrolę dostępu do danych, zabezpieczenie kont i systemów informatycznych oraz ochronę transmisji danych.',
          'Strona wykorzystuje połączenie HTTPS, jeżeli zostało prawidłowo skonfigurowane na serwerze.',
          'Dostęp do danych osobowych mają wyłącznie osoby upoważnione oraz podmioty, którym dane są niezbędne do realizacji określonych usług.',
        ],
      },
    ],
  },
  {
    no: '§12',
    title: 'Media społecznościowe',
    blocks: [
      {
        ol: [
          'Stronivo prowadzi komunikację za pośrednictwem platform społecznościowych, takich jak Instagram, Facebook i TikTok.',
          'Korzystanie z tych platform wiąże się z przetwarzaniem danych również przez ich operatorów, zgodnie z obowiązującymi u nich zasadami prywatności.',
          'W przypadku kontaktu ze Stronivo przez media społecznościowe dane zawarte w wiadomościach mogą być przetwarzane w celu obsługi korespondencji i zapytań ofertowych.',
        ],
      },
    ],
  },
  {
    no: '§13',
    title: 'Asystent AI (czat „Stroniq”)',
    blocks: [
      {
        ol: [
          'Na stronie działa asystent oparty na sztucznej inteligencji, który odpowiada na pytania o ofertę i pomaga przygotować zapytanie ofertowe. Odpowiedzi generuje model językowy dostarczany przez Anthropic PBC (USA); mogą one zawierać błędy, a wiążących informacji udziela zespół Stronivo.',
          'Treść wiadomości wpisywanych w czacie jest przekazywana do dostawcy modelu wyłącznie w celu wygenerowania odpowiedzi. Administrator nie zapisuje treści rozmów na swoich serwerach; historia rozmowy jest przechowywana tylko w przeglądarce użytkownika do czasu zamknięcia karty. Prosimy nie podawać w czacie danych wrażliwych.',
          'Jeżeli użytkownik zdecyduje się wysłać zapytanie przygotowane z asystentem, przekazuje podsumowanie swoich potrzeb oraz podane dobrowolnie dane kontaktowe (imię, adres e-mail, opcjonalnie numer telefonu) w celu przygotowania wyceny — podstawą przetwarzania jest art. 6 ust. 1 lit. b RODO (działania przed zawarciem umowy) oraz zgoda wyrażona w formularzu.',
          'Przekazanie danych poza EOG odbywa się na zasadach opisanych w §8.',
        ],
      },
    ],
  },
  {
    no: '§14',
    title: 'Zautomatyzowane podejmowanie decyzji',
    blocks: [
      {
        p: 'Dane osobowe użytkowników nie są wykorzystywane przez administratora do podejmowania decyzji wywołujących wobec nich skutki prawne lub podobnie istotnie na nich wpływających, opartych wyłącznie na zautomatyzowanym przetwarzaniu danych.',
      },
    ],
  },
  {
    no: '§15',
    title: 'Linki zewnętrzne',
    blocks: [
      {
        ol: [
          'Strona może zawierać odnośniki do zewnętrznych witryn internetowych, w tym stron klientów, partnerów oraz platform społecznościowych.',
          'Administrator nie odpowiada za polityki prywatności i zasady przetwarzania danych stosowane przez niezależnych operatorów tych witryn.',
          'Zaleca się zapoznanie z polityką prywatności odwiedzanych serwisów.',
        ],
      },
    ],
  },
  {
    no: '§16',
    title: 'Zmiany Polityki Prywatności',
    blocks: [
      {
        ol: [
          'Administrator może aktualizować niniejszą Politykę Prywatności w przypadku zmian prawnych, organizacyjnych lub technologicznych.',
          'Aktualna wersja dokumentu będzie publikowana na stronie https://stronivo.com.',
          'Data ostatniej aktualizacji znajduje się na początku dokumentu.',
        ],
      },
    ],
  },
]
