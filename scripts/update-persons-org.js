// // Script til at opdatere eksisterende brugere/teamleads med organization_id i Supabase
// // Kør dette script én gang med Node.js (efter at have installeret @supabase/supabase-js)

// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
// const supabaseKey = 'YOUR_SERVICE_ROLE_KEY'; // Brug service role key for at kunne opdatere alle rækker
// const supabase = createClient(supabaseUrl, supabaseKey);

// const ORGANIZATION_ID = 'PASTE_ORG_UUID_HERE'; // Sæt det ønskede org UUID her
// const PERSON_IDS = [
//   // Sæt de person-id'er (uuid) ind, der skal tilknyttes org
//   'person-uuid-1',
//   'person-uuid-2',
//   // ...
// ];

// async function updatePersonsOrg() {
//   for (const id of PERSON_IDS) {
//     const { error } = await supabase
//       .from('persons')
//       .update({ organization_id: ORGANIZATION_ID })
//       .eq('id', id);
//     if (error) {
//       console.error(`Fejl ved opdatering af ${id}:`, error.message);
//     } else {
//       console.log(`Opdateret person ${id}`);
//     }
//   }
// }

// updatePersonsOrg();
