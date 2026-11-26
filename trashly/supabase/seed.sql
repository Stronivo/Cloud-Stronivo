-- Dane słownikowe Trashly. Przewodnik ładuje skrypt server/scripts (lub ręcznie z server/data/guide.json).
insert into municipalities (id, name, teryt, voivodeship, official_info_url, pszok_url, capabilities, rules, integration_note) values
 ('zory','Żory','247901','śląskie','https://www.zory.pl/dla-mieszkancow/gospodarka-odpadami/harmonogramy','https://www.zory.pl/dla-mieszkancow/gospodarka-odpadami/pszok',
  '{"streetAutocomplete":true,"buildingValidation":true,"schedule":"PDF_INGEST"}','{"setOutBy":null}', 'Harmonogram z oficjalnego PDF UM Żory.'),
 ('jastrzebie','Jastrzębie-Zdrój','246701','śląskie','https://www.jastrzebie.pl/dla-mieszkanca/gospodarka-odpadami-komunalnymi/harmonogramy','https://www.jastrzebie.pl/dla-mieszkanca/gospodarka-odpadami-komunalnymi/punkty-pszok',
  '{"streetAutocomplete":false,"buildingValidation":true,"schedule":"NOT_INTEGRATED"}','{"setOutBy":"06:00"}', 'Integracja PDF w przygotowaniu.'),
 ('rybnik','Rybnik','247301','śląskie','https://www.rybnik.eu/dla-mieszkancow/odpady-komunalne/harmonogramy-odbioru-2026','https://www.rybnik.eu/dla-mieszkancow/odpady-komunalne/punkty-zbiorki-odpadow-pszok',
  '{"streetAutocomplete":false,"buildingValidation":true,"schedule":"NOT_INTEGRATED"}','{"setOutBy":"06:00"}', 'Integracja PDF w przygotowaniu.'),
 ('warszawa','Warszawa','146501','mazowieckie','https://warszawa19115.pl/harmonogramy-wywozu-odpadow',null,
  '{"streetAutocomplete":true,"buildingValidation":true,"schedule":"LIVE"}','{"setOutBy":null}', 'Warszawa 19115.'),
 ('poznan','Poznań','306401','wielkopolskie','https://www.poznan.pl/mim/odpady/harmonogramy.html','https://goap.org.pl/',
  '{"streetAutocomplete":true,"buildingValidation":true,"schedule":"LIVE"}','{"setOutBy":null}', 'poznan.pl.')
on conflict (id) do nothing;

insert into waste_categories (key, name, container, color, legal_basis) values
 ('zmieszane','Odpady zmieszane','Pojemnik na odpady zmieszane',null,null),
 ('plastik','Metale i tworzywa sztuczne','Żółty worek lub pojemnik','#F2C230','Dz.U. 2017 poz. 19'),
 ('papier','Papier','Niebieski worek lub pojemnik','#2F6FD6','Dz.U. 2017 poz. 19'),
 ('szklo','Szkło','Zielony worek lub pojemnik','#2E9A5B','Dz.U. 2017 poz. 19'),
 ('bio','Bioodpady','Brązowy pojemnik lub worek','#8A5A35','Dz.U. 2017 poz. 19'),
 ('zielone','Odpady zielone','Brązowy pojemnik lub worek','#5E8C3A','Dz.U. 2017 poz. 19'),
 ('segregowane','Papier, plastik i szkło','Worki: niebieski, żółty i zielony','#3E7CB1','Dz.U. 2017 poz. 19'),
 ('popiol','Popiół','Osobny pojemnik na popiół',null,null),
 ('gabaryty','Odpady wielkogabarytowe','Wystaw przy posesji',null,null),
 ('elektro','Elektroodpady','Wystaw przy posesji',null,null),
 ('opony','Opony','Wystaw przy posesji',null,null),
 ('choinki','Choinki','Wystaw przy posesji',null,null),
 ('liscie','Liście','Worki z liśćmi',null,null)
on conflict (key) do nothing;
