ALTER TABLE public.care_summaries
DROP CONSTRAINT IF EXISTS care_summaries_patient_id_fkey;

ALTER TABLE public.care_summaries
ADD CONSTRAINT care_summaries_patient_id_fkey
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;