-- Car Tracker — vehicle make / model lookups
-- Makes and models are shared reference data (read-only for users).
-- vehicles.make / vehicles.model keep the English name (or free text for "Other");
-- make_code / model_id link to the lookup when one was chosen.

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table if not exists public.vehicle_makes (
  code       text primary key,
  name_en    text not null,
  name_ar    text,
  sort_order int not null default 100
);

create table if not exists public.vehicle_models (
  id         bigint generated always as identity primary key,
  make_code  text not null references public.vehicle_makes(code) on delete cascade,
  name_en    text not null,
  name_ar    text,
  sort_order int not null default 100,
  unique (make_code, name_en)
);

create index if not exists vehicle_models_make_idx on public.vehicle_models(make_code, sort_order);

alter table public.vehicles
  add column if not exists make_code text references public.vehicle_makes(code) on delete set null,
  add column if not exists model_id  bigint references public.vehicle_models(id) on delete set null;

-- ---------------------------------------------------------------------
-- Access: everyone signed in can read, nobody can write through the API
-- ---------------------------------------------------------------------
alter table public.vehicle_makes  enable row level security;
alter table public.vehicle_models enable row level security;

drop policy if exists vehicle_makes_read on public.vehicle_makes;
create policy vehicle_makes_read on public.vehicle_makes
  for select to authenticated using (true);

drop policy if exists vehicle_models_read on public.vehicle_models;
create policy vehicle_models_read on public.vehicle_models
  for select to authenticated using (true);

grant select on public.vehicle_makes, public.vehicle_models to authenticated;

-- ---------------------------------------------------------------------
-- Data (re-runnable). name_ar null = show the English name.
-- ---------------------------------------------------------------------
insert into public.vehicle_makes (code, name_en, name_ar, sort_order) values
  ('toyota',        'Toyota',        'تويوتا',        10),
  ('hyundai',       'Hyundai',       'هيونداي',       20),
  ('nissan',        'Nissan',        'نيسان',         30),
  ('kia',           'Kia',           'كيا',           40),
  ('chevrolet',     'Chevrolet',     'شيفروليه',      50),
  ('ford',          'Ford',          'فورد',          60),
  ('gmc',           'GMC',           'جي إم سي',      70),
  ('lexus',         'Lexus',         'لكزس',          80),
  ('honda',         'Honda',         'هوندا',         90),
  ('mitsubishi',    'Mitsubishi',    'ميتسوبيشي',     100),
  ('mazda',         'Mazda',         'مازدا',         110),
  ('isuzu',         'Isuzu',         'إيسوزو',        120),
  ('suzuki',        'Suzuki',        'سوزوكي',        130),
  ('changan',       'Changan',       'شانجان',        140),
  ('geely',         'Geely',         'جيلي',          150),
  ('mg',            'MG',            'إم جي',         160),
  ('chery',         'Chery',         'شيري',          170),
  ('haval',         'Haval',         'هافال',         180),
  ('jetour',        'Jetour',        'جيتور',         190),
  ('byd',           'BYD',           'بي واي دي',     200),
  ('mercedes',      'Mercedes-Benz', 'مرسيدس بنز',    210),
  ('bmw',           'BMW',           'بي إم دبليو',   220),
  ('audi',          'Audi',          'أودي',          230),
  ('volkswagen',    'Volkswagen',    'فولكس واجن',    240),
  ('land_rover',    'Land Rover',    'لاند روفر',     250),
  ('jeep',          'Jeep',          'جيب',           260),
  ('dodge',         'Dodge',         'دودج',          270),
  ('cadillac',      'Cadillac',      'كاديلاك',       280),
  ('infiniti',      'Infiniti',      'إنفينيتي',      290),
  ('genesis',       'Genesis',       'جينيسيس',       300),
  ('porsche',       'Porsche',       'بورشه',         310),
  ('tesla',         'Tesla',         'تسلا',          320),
  ('peugeot',       'Peugeot',       'بيجو',          330),
  ('renault',       'Renault',       'رينو',          340)
on conflict (code) do update set
  name_en = excluded.name_en,
  name_ar = excluded.name_ar,
  sort_order = excluded.sort_order;

insert into public.vehicle_models (make_code, name_en, name_ar, sort_order)
-- Models keep the order listed here (roughly by popularity).
select m.make_code, m.name_en, m.name_ar, (row_number() over ())::int
from (values
  ('toyota', 'Camry', 'كامري'), ('toyota', 'Corolla', 'كورولا'), ('toyota', 'Yaris', 'يارس'),
  ('toyota', 'Land Cruiser', 'لاند كروزر'), ('toyota', 'Prado', 'برادو'), ('toyota', 'Hilux', 'هايلكس'),
  ('toyota', 'Fortuner', 'فورتشنر'), ('toyota', 'RAV4', 'راف فور'), ('toyota', 'Avalon', 'أفالون'),
  ('toyota', 'Highlander', 'هايلاندر'), ('toyota', 'Sequoia', 'سيكويا'), ('toyota', 'Rush', 'رش'),
  ('toyota', 'Innova', 'إنوفا'), ('toyota', 'Hiace', 'هايس'), ('toyota', 'C-HR', null),
  ('toyota', 'Crown', 'كراون'), ('toyota', 'Raize', 'رايز'), ('toyota', 'Corolla Cross', 'كورولا كروس'),

  ('hyundai', 'Accent', 'أكسنت'), ('hyundai', 'Elantra', 'إلنترا'), ('hyundai', 'Sonata', 'سوناتا'),
  ('hyundai', 'Azera', 'أزيرا'), ('hyundai', 'Tucson', 'توسان'), ('hyundai', 'Santa Fe', 'سنتافي'),
  ('hyundai', 'Creta', 'كريتا'), ('hyundai', 'Kona', 'كونا'), ('hyundai', 'Venue', 'فينيو'),
  ('hyundai', 'Palisade', 'باليسيد'), ('hyundai', 'Staria', 'ستاريا'), ('hyundai', 'H1', null),

  ('nissan', 'Sunny', 'صني'), ('nissan', 'Sentra', 'سنترا'), ('nissan', 'Altima', 'ألتيما'),
  ('nissan', 'Maxima', 'ماكسيما'), ('nissan', 'Patrol', 'باترول'), ('nissan', 'X-Trail', 'إكس تريل'),
  ('nissan', 'Pathfinder', 'باثفايندر'), ('nissan', 'Kicks', 'كيكس'), ('nissan', 'Navara', 'نافارا'),
  ('nissan', 'Armada', 'أرمادا'), ('nissan', 'Urvan', 'أورفان'),

  ('kia', 'Pegas', 'بيجاس'), ('kia', 'Rio', 'ريو'), ('kia', 'Cerato', 'سيراتو'), ('kia', 'K5', null),
  ('kia', 'K8', null), ('kia', 'Sportage', 'سبورتاج'), ('kia', 'Sorento', 'سورينتو'),
  ('kia', 'Seltos', 'سيلتوس'), ('kia', 'Sonet', 'سونيت'), ('kia', 'Carnival', 'كرنفال'),
  ('kia', 'Telluride', 'تيلورايد'),

  ('chevrolet', 'Spark', 'سبارك'), ('chevrolet', 'Aveo', 'أفيو'), ('chevrolet', 'Groove', 'جروف'),
  ('chevrolet', 'Malibu', 'ماليبو'), ('chevrolet', 'Captiva', 'كابتيفا'), ('chevrolet', 'Blazer', 'بليزر'),
  ('chevrolet', 'Traverse', 'ترافرس'), ('chevrolet', 'Tahoe', 'تاهو'), ('chevrolet', 'Suburban', 'سوبربان'),
  ('chevrolet', 'Silverado', 'سلفرادو'), ('chevrolet', 'Camaro', 'كامارو'),

  ('ford', 'Taurus', 'تورس'), ('ford', 'Territory', 'تيريتوري'), ('ford', 'Edge', 'إيدج'),
  ('ford', 'Explorer', 'إكسبلورر'), ('ford', 'Expedition', 'إكسبديشن'), ('ford', 'Bronco', 'برونكو'),
  ('ford', 'Ranger', 'رينجر'), ('ford', 'F-150', null), ('ford', 'Mustang', 'موستانج'),

  ('gmc', 'Terrain', 'تيرين'), ('gmc', 'Acadia', 'أكاديا'), ('gmc', 'Yukon', 'يوكن'),
  ('gmc', 'Sierra', 'سييرا'),

  ('lexus', 'ES', null), ('lexus', 'IS', null), ('lexus', 'LS', null), ('lexus', 'UX', null),
  ('lexus', 'NX', null), ('lexus', 'RX', null), ('lexus', 'GX', null), ('lexus', 'LX', null),

  ('honda', 'City', 'سيتي'), ('honda', 'Civic', 'سيفيك'), ('honda', 'Accord', 'أكورد'),
  ('honda', 'HR-V', null), ('honda', 'CR-V', null), ('honda', 'Pilot', 'بايلوت'),
  ('honda', 'Odyssey', 'أوديسي'),

  ('mitsubishi', 'Attrage', 'أتراج'), ('mitsubishi', 'Lancer', 'لانسر'), ('mitsubishi', 'Xpander', 'إكسباندر'),
  ('mitsubishi', 'ASX', null), ('mitsubishi', 'Eclipse Cross', 'إكليبس كروس'), ('mitsubishi', 'Outlander', 'أوتلاندر'),
  ('mitsubishi', 'Pajero', 'باجيرو'), ('mitsubishi', 'Montero Sport', 'مونتيرو سبورت'), ('mitsubishi', 'L200', null),

  ('mazda', 'Mazda2', null), ('mazda', 'Mazda3', null), ('mazda', 'Mazda6', null),
  ('mazda', 'CX-3', null), ('mazda', 'CX-30', null), ('mazda', 'CX-5', null), ('mazda', 'CX-9', null),
  ('mazda', 'CX-90', null),

  ('isuzu', 'D-Max', 'دي ماكس'), ('isuzu', 'MU-X', null), ('isuzu', 'NPR', null),

  ('suzuki', 'Swift', 'سويفت'), ('suzuki', 'Dzire', 'ديزاير'), ('suzuki', 'Ciaz', 'سياز'),
  ('suzuki', 'Baleno', 'بالينو'), ('suzuki', 'Ertiga', 'إرتيجا'), ('suzuki', 'Vitara', 'فيتارا'),
  ('suzuki', 'Jimny', 'جيمني'),

  ('changan', 'Alsvin', 'ألسفن'), ('changan', 'Eado', 'إيدو'), ('changan', 'CS35 Plus', null),
  ('changan', 'CS75 Plus', null), ('changan', 'CS85', null), ('changan', 'CS95', null),
  ('changan', 'UNI-K', null), ('changan', 'UNI-T', null),

  ('geely', 'Emgrand', 'إمجراند'), ('geely', 'Coolray', 'كولراي'), ('geely', 'Tugella', 'توجيلا'),
  ('geely', 'Monjaro', 'مونجارو'), ('geely', 'Okavango', 'أوكافانجو'),

  ('mg', 'MG5', null), ('mg', 'MG6', null), ('mg', 'GT', null), ('mg', 'ZS', null),
  ('mg', 'HS', null), ('mg', 'RX5', null), ('mg', 'RX8', null), ('mg', 'One', null),

  ('chery', 'Arrizo 5', 'أريزو 5'), ('chery', 'Arrizo 6', 'أريزو 6'), ('chery', 'Tiggo 4', 'تيجو 4'),
  ('chery', 'Tiggo 7', 'تيجو 7'), ('chery', 'Tiggo 8', 'تيجو 8'),

  ('haval', 'Jolion', 'جوليون'), ('haval', 'H6', null), ('haval', 'Dargo', 'دارجو'), ('haval', 'H9', null),

  ('jetour', 'Dashing', 'داشينج'), ('jetour', 'X70', null), ('jetour', 'X90', null), ('jetour', 'T2', null),

  ('byd', 'Qin Plus', 'كين بلس'), ('byd', 'Seal', 'سيل'), ('byd', 'Han', 'هان'),
  ('byd', 'Atto 3', 'أتو 3'), ('byd', 'Song Plus', 'سونج بلس'),

  ('mercedes', 'A-Class', null), ('mercedes', 'C-Class', null), ('mercedes', 'E-Class', null),
  ('mercedes', 'S-Class', null), ('mercedes', 'CLA', null), ('mercedes', 'GLA', null),
  ('mercedes', 'GLC', null), ('mercedes', 'GLE', null), ('mercedes', 'GLS', null), ('mercedes', 'G-Class', null),

  ('bmw', '3 Series', null), ('bmw', '5 Series', null), ('bmw', '7 Series', null),
  ('bmw', 'X1', null), ('bmw', 'X3', null), ('bmw', 'X5', null), ('bmw', 'X6', null), ('bmw', 'X7', null),

  ('audi', 'A3', null), ('audi', 'A4', null), ('audi', 'A6', null), ('audi', 'A8', null),
  ('audi', 'Q3', null), ('audi', 'Q5', null), ('audi', 'Q7', null), ('audi', 'Q8', null),

  ('volkswagen', 'Golf', 'جولف'), ('volkswagen', 'Jetta', 'جيتا'), ('volkswagen', 'Passat', 'باسات'),
  ('volkswagen', 'Tiguan', 'تيجوان'), ('volkswagen', 'Teramont', 'تيرامونت'), ('volkswagen', 'Touareg', 'طوارق'),

  ('land_rover', 'Defender', 'ديفندر'), ('land_rover', 'Discovery', 'ديسكفري'),
  ('land_rover', 'Range Rover', 'رنج روفر'), ('land_rover', 'Range Rover Sport', 'رنج روفر سبورت'),
  ('land_rover', 'Range Rover Velar', 'رنج روفر فيلار'), ('land_rover', 'Range Rover Evoque', 'رنج روفر إيفوك'),

  ('jeep', 'Compass', 'كومباس'), ('jeep', 'Cherokee', 'شيروكي'), ('jeep', 'Grand Cherokee', 'جراند شيروكي'),
  ('jeep', 'Wrangler', 'رانجلر'),

  ('dodge', 'Charger', 'تشارجر'), ('dodge', 'Challenger', 'تشالنجر'), ('dodge', 'Durango', 'دورانجو'),
  ('dodge', 'Ram', 'رام'),

  ('cadillac', 'CT4', null), ('cadillac', 'CT5', null), ('cadillac', 'XT4', null), ('cadillac', 'XT5', null),
  ('cadillac', 'XT6', null), ('cadillac', 'Escalade', 'إسكاليد'),

  ('infiniti', 'Q50', null), ('infiniti', 'QX50', null), ('infiniti', 'QX55', null),
  ('infiniti', 'QX60', null), ('infiniti', 'QX80', null),

  ('genesis', 'G70', null), ('genesis', 'G80', null), ('genesis', 'G90', null),
  ('genesis', 'GV70', null), ('genesis', 'GV80', null),

  ('porsche', '911', null), ('porsche', 'Macan', 'ماكان'), ('porsche', 'Cayenne', 'كايين'),
  ('porsche', 'Panamera', 'باناميرا'), ('porsche', 'Taycan', 'تايكان'),

  ('tesla', 'Model 3', null), ('tesla', 'Model Y', null), ('tesla', 'Model S', null), ('tesla', 'Model X', null),

  ('peugeot', '208', null), ('peugeot', '301', null), ('peugeot', '508', null),
  ('peugeot', '2008', null), ('peugeot', '3008', null), ('peugeot', '5008', null),

  ('renault', 'Symbol', 'سيمبول'), ('renault', 'Megane', 'ميجان'), ('renault', 'Duster', 'داستر'),
  ('renault', 'Koleos', 'كوليوس')
) as m(make_code, name_en, name_ar)
on conflict (make_code, name_en) do update set
  name_ar = excluded.name_ar,
  sort_order = excluded.sort_order;
