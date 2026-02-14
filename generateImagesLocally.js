/**
 * Generate Illustrations Locally
 *
 * This script runs on YOUR machine (not Supabase Edge Functions)
 * to generate images with Gemini and upload them to Supabase Storage.
 *
 * Usage:
 * GEMINI_API_KEY=your_key node scripts/generateImagesLocally.js
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = 'https://fwhafpasoifwwgfudaeq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable is required');
  console.log('\nUsage:');
  console.log('GEMINI_API_KEY=your_key SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/generateImagesLocally.js');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('\nYou can find it in Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

const STYLE_PREFIX = `Create a soft pastel watercolor-style illustration with a light, airy feel.
Use soft blues (#3B8BA8), gentle purples (#8b5cf6), warm pinks (#f472b6), and cream whites.
The style should be minimalist, calming, and suitable for a mental health support app.
No text in the image, no detailed facial features, abstract or symbolic representation preferred.
Square format, clean edges, subtle gradient background.

Specific image request: `;

// Already generated - DON'T regenerate (expensive!)
const ALREADY_GENERATED = [
  // Assessment axis icons
  'assessment/ani',
  'assessment/partner',
  'assessment/communication',
  'assessment/relationship',
  'assessment/parenting',
  'assessment/child',
  'assessment/sibling',
  // Tool icons
  'tools/breathing',
  'tools/gratitude',
  'tools/grounding',
  'tools/journaling',
  'tools/movement',
  'tools/connection',
  'tools/bodyscan',
  'tools/leavesstream',
  // Tab icons
  'tabs/today',
  'tabs/learn',
  'tabs/practice',
  'tabs/assessment',
  'tabs/crisis',
  // General icons
  'icons/success',
  'icons/insight',
  'icons/target',
  'icons/meditation',
  'icons/psychoed-badge',
  // Full-body body scan images
  'bodyscan/male-face',
  'bodyscan/male-jaw',
  'bodyscan/male-shoulders',
  'bodyscan/male-chest',
  'bodyscan/male-belly',
  'bodyscan/male-legs',
  'bodyscan/female-face',
  'bodyscan/female-jaw',
  'bodyscan/female-shoulders',
  'bodyscan/female-chest',
  'bodyscan/female-belly',
  'bodyscan/female-legs',
  // Grounding senses
  'grounding/sight',
  'grounding/touch',
  'grounding/hearing',
  'grounding/smell',
  'grounding/taste',
  // Gratitude icons
  'gratitude/lightbulb',
  'gratitude/prayer',
  'gratitude/star',
  'gratitude/checkmark',
  // Leaves stream
  'leavesstream/river',
  'leavesstream/stream-intro',
  'leavesstream/leaf-green',
  'leavesstream/leaf-orange',
  'leavesstream/leaf-red',
  'leavesstream/leaf-yellow',
  // Branding
  'branding/header',
  // Emotional quadrant icons
  'quadrants/high-energy-positive',
  'quadrants/low-energy-positive',
  'quadrants/high-energy-negative',
  'quadrants/low-energy-negative',
  // Psychoeducation images
  'psychoed/resilience',
  'psychoed/body-supporter',
  'psychoed/body-loved-one',
  'psychoed/why-different',
  'psychoed/relationship',
  'psychoed/boundaries',
  'psychoed/secondary-trauma',
  'psychoed/compassion-fatigue',
  'psychoed/parenting-distress',
  // Simulator category icons
  'simulator/category-partner',
  'simulator/category-teenagers',
  'simulator/category-children',
  'simulator/category-family',
  'simulator/category-friends',
  // Simulator template icons
  'simulator/partner-boundaries',
  'simulator/partner-difficult-news',
  'simulator/partner-conflict',
  'simulator/partner-needs',
  'simulator/teen-boundaries',
  'simulator/teen-school',
  'simulator/teen-friends',
  'simulator/child-divorce',
  'simulator/child-fears',
  'simulator/child-behavior',
  'simulator/family-aging-parents',
  'simulator/family-sibling-conflict',
  'simulator/family-in-laws',
  'simulator/friend-distance',
  'simulator/friend-support',
  'simulator/friend-boundaries',
  // Simulator tool main icon
  'tools/simulator',
  // Conversation setup - person role icons
  'simulator/role-partner',
  'simulator/role-parent',
  'simulator/role-child',
  'simulator/role-sibling',
  'simulator/role-friend',
  'simulator/role-other',
  // Conversation setup - difficulty icons
  'simulator/difficulty-easy',
  'simulator/difficulty-medium',
  'simulator/difficulty-hard',
  // Emotion trend icons
  'emotions/happy',
  'emotions/sad',
  'emotions/angry',
  'emotions/calm',
  'emotions/lonely',
  'emotions/tired',
  'emotions/bored',
  'emotions/curious',
  'emotions/excited',
  'emotions/tense',
  // Leaves stream additional
  'leavesstream/river',
  'leavesstream/stream-intro',
  'leavesstream/leaf-green',
  'leavesstream/leaf-orange',
  'leavesstream/leaf-red',
  'leavesstream/leaf-yellow',
  // Kan BaGuf tool icon + female silhouette (KEEP — user approved)
  'tools/kanbaguf',
  'kanbaguf/silhouette-female',
  // The Wall tool icon
  'tools/wall',
  // Kan BaGuf male silhouette
  'kanbaguf/silhouette-male',
  // Three Circles tool icon
  'tools/threecircles',
  // Sleep Battle psychoeducation
  'psychoed/sleep-battle',
];

// Shared style for full-body body scan images
const BODYSCAN_FULL_BODY_STYLE = `
Standing human figure in a peaceful, relaxed pose. Soft sketch or line art style with minimal detail.
The figure should be centered, facing forward, arms slightly away from body, legs together.
Light lavender/purple background. The body outline should be soft gray or light purple.
The HIGHLIGHTED body part should have a warm glowing heatmap effect - soft orange/coral/pink gradient
radiating outward from that area, like a gentle warmth or energy emanating from that spot.
The rest of the body remains in soft muted tones while the highlighted area glows warmly.
Calming, meditative feel. No facial features needed - just a peaceful silhouette.
Square format, clean edges.
`;

const IMAGE_PROMPTS = {
  // ============================================
  // PSYCHOEDUCATION IMAGES
  // ============================================

  // Psychoeducation: Resilience (חוסן מהו) - The filling/emptying container metaphor
  'psychoed/resilience': 'Abstract illustration of a glowing transparent container or vessel being filled with soft light, representing inner resilience and emotional capacity. Soft purple and lavender tones with gentle golden light inside. Calming, hopeful, watercolor style, symbolic of psychological resilience and self-care',

  // Psychoeducation: Body Supporter (מה קורה לך בגוף) - Supporter's body under stress
  'psychoed/body-supporter': 'Abstract human silhouette with soft pink and purple tones, gentle stress patterns visible in shoulders and chest area, but overall peaceful and healing energy. Represents body awareness for caregivers. Soft watercolor style, calming but acknowledging tension',

  // Psychoeducation: Body Loved One (מה קורה לו בגוף) - Nervous system response
  'psychoed/body-loved-one': 'Abstract illustration of a nervous system or brain connections, soft red and coral tones transitioning to calming blue, representing the fight-or-flight response and healing. Gentle watercolor style, educational but soothing',

  // Psychoeducation: Why Different (למה הוא חזר שונה) - Change after trauma
  'psychoed/why-different': 'Two overlapping silhouettes - one faded/ghostly representing the past, one solid but different representing present, soft blue and purple tones, gentle transition between them. Represents transformation after trauma. Compassionate, understanding mood',

  // Psychoeducation: Relationship (מה קורה לקשר) - Relationship dynamics
  'psychoed/relationship': 'Two abstract figures reaching toward each other with a gentle gap between them, soft yellow and amber tones, representing connection and distance in relationships. Watercolor style, hopeful but realistic about challenges',

  // Psychoeducation: Boundaries (גבולות בקשר) - Healthy boundaries
  'psychoed/boundaries': 'Abstract illustration showing a soft protective circle or bubble around a peaceful figure, gentle green and mint tones, representing healthy boundaries without walls. Watercolor style, empowering and gentle',

  // Psychoeducation: Secondary Trauma (טראומטיזציה משנית) - Absorbing others pain
  'psychoed/secondary-trauma': 'Abstract illustration of gentle waves or ripples moving from one figure to another, soft cyan and teal tones, representing how emotions transfer. Watercolor style, validating and understanding',

  // Psychoeducation: Compassion Fatigue (שחיקת אמפתיה) - When the heart gets tired
  'psychoed/compassion-fatigue': 'Abstract heart shape with soft fading edges, gentle pink and rose tones becoming more muted, representing emotional exhaustion. Small spark of light remains at center showing hope. Watercolor style, compassionate and validating',

  // Psychoeducation: Parenting Under Distress (הורות כשיש מצוקה בבית) - Parenting during household distress
  'psychoed/parenting-distress': 'A warm protective house shape with small figures inside representing a family during difficulty, soft warm orange and peach tones, safety and nurturing even in hard times. Watercolor style, compassionate and hopeful',

  // Psychoeducation: Sleep Battle (הקרב על השינה) - Trauma-related sleep disturbances
  'psychoed/sleep-battle': 'Abstract illustration of a peaceful night sky with a crescent moon and soft stars, transitioning from dark restless tones to calm indigo and lavender, representing the journey from disturbed sleep to peaceful rest. Watercolor style, soothing and hopeful',

  // Psychoeducation type icon (small badge/indicator)
  'icons/psychoed-badge': 'Small circular badge or icon with an open book and soft glowing light, representing educational content. Soft purple and cream tones, minimalist, clean edges, suitable for small display',

  // ============================================
  // EMOTIONAL QUADRANT ICONS
  // ============================================

  // Emotional quadrant icons for daily check-in summary
  'quadrants/high-energy-positive': 'Abstract joyful energetic symbol, soft bursting sun rays or sparkles, bright warm yellow and soft orange tones, happiness and enthusiasm, uplifting energy, minimalist icon style',
  'quadrants/low-energy-positive': 'Abstract calm peaceful symbol, soft gentle cloud or serene water ripple, soothing teal and soft mint green tones, tranquility and contentment, relaxed energy, minimalist icon style',
  'quadrants/high-energy-negative': 'Abstract tense symbol, soft lightning or swirling energy, warm coral red and soft orange tones, frustration or anxiety energy, intense but not aggressive, minimalist icon style',
  'quadrants/low-energy-negative': 'Abstract melancholy symbol, soft drooping cloud or gentle rain drop, cool blue-gray and soft purple tones, sadness or tiredness, low energy feeling, minimalist icon style',

  // ============================================
  // TAB BAR ICONS (5 tabs)
  // ============================================

  // Today tab (formerly Home) - Sunrise/new day concept
  'tabs/today': 'Minimalist sunrise icon with soft golden rays emerging over a gentle horizon line. Warm amber and soft peach gradient, representing a new day and fresh start. Clean modern icon style, suitable for app tab bar, soft pastel watercolor aesthetic, square format with centered composition',

  // Learn tab - Open book with soft glow
  'tabs/learn': 'Minimalist open book icon with soft pages and gentle light emanating from within. Soft purple and lavender tones with cream highlights. Knowledge and growth concept, clean modern icon style suitable for app tab bar, soft pastel watercolor aesthetic, square format',

  // Practice tab - Lotus or meditation flower
  'tabs/practice': 'Minimalist lotus flower icon in soft bloom, petals gently open. Soft teal and mint green tones with delicate pink center. Represents mindful practice and inner peace, clean modern icon style suitable for app tab bar, soft pastel watercolor aesthetic, square format',

  // Assessment tab - Gentle chart/progress visualization
  'tabs/assessment': 'Minimalist circular chart or pie visualization icon with soft segments. Soft blue and lavender tones with subtle gradient. Represents self-reflection and progress tracking, clean modern icon style suitable for app tab bar, soft pastel watercolor aesthetic, square format',

  // Crisis/Help tab - Embracing hands or heart with support
  'tabs/crisis': 'Minimalist icon of two hands gently cupping or supporting a small heart or star. Soft coral pink and warm peach tones with gentle glow. Represents care, support and help when needed, clean modern icon style suitable for app tab bar, soft pastel watercolor aesthetic, square format',

  // NEW: Full-body body scan images with highlighted areas (MALE)
  'bodyscan/male-face': BODYSCAN_FULL_BODY_STYLE + 'MALE figure with subtle masculine proportions. HIGHLIGHT: The FACE/HEAD area glows with warm orange-pink heatmap effect.',
  'bodyscan/male-jaw': BODYSCAN_FULL_BODY_STYLE + 'MALE figure with subtle masculine proportions. HIGHLIGHT: The JAW/lower face area glows with warm orange-pink heatmap effect.',
  'bodyscan/male-shoulders': BODYSCAN_FULL_BODY_STYLE + 'MALE figure with subtle masculine proportions. HIGHLIGHT: The SHOULDERS and upper back area glow with warm orange-pink heatmap effect.',
  'bodyscan/male-chest': BODYSCAN_FULL_BODY_STYLE + 'MALE figure with subtle masculine proportions. HIGHLIGHT: The CHEST/upper torso area glows with warm orange-pink heatmap effect.',
  'bodyscan/male-belly': BODYSCAN_FULL_BODY_STYLE + 'MALE figure with subtle masculine proportions. HIGHLIGHT: The BELLY/abdomen area glows with warm orange-pink heatmap effect.',
  'bodyscan/male-legs': BODYSCAN_FULL_BODY_STYLE + 'MALE figure with subtle masculine proportions. HIGHLIGHT: Both LEGS must glow from the hips ALL THE WAY DOWN to the feet. The warm orange-pink heatmap glow must cover: upper thighs, lower thighs, both knees, both calves, both ankles, and both feet completely. The entire lower body below the waist should be glowing warmly. Do NOT leave the lower legs or feet unlit.',

  // NEW: Full-body body scan images with highlighted areas (FEMALE)
  'bodyscan/female-face': BODYSCAN_FULL_BODY_STYLE + 'FEMALE figure with subtle feminine proportions. HIGHLIGHT: The FACE/HEAD area glows with warm orange-pink heatmap effect.',
  'bodyscan/female-jaw': BODYSCAN_FULL_BODY_STYLE + 'FEMALE figure with subtle feminine proportions. HIGHLIGHT: The JAW/lower face area glows with warm orange-pink heatmap effect.',
  'bodyscan/female-shoulders': BODYSCAN_FULL_BODY_STYLE + 'FEMALE figure with subtle feminine proportions. HIGHLIGHT: The SHOULDERS and upper back area glow with warm orange-pink heatmap effect.',
  'bodyscan/female-chest': BODYSCAN_FULL_BODY_STYLE + 'FEMALE figure with subtle feminine proportions. HIGHLIGHT: The CHEST/upper torso area glows with warm orange-pink heatmap effect.',
  'bodyscan/female-belly': BODYSCAN_FULL_BODY_STYLE + 'FEMALE figure with subtle feminine proportions. HIGHLIGHT: The BELLY/abdomen area glows with warm orange-pink heatmap effect.',
  'bodyscan/female-legs': BODYSCAN_FULL_BODY_STYLE + 'FEMALE figure with subtle feminine proportions. HIGHLIGHT: Both LEGS must glow from the hips ALL THE WAY DOWN to the feet. The warm orange-pink heatmap glow must cover: upper thighs, lower thighs, both knees, both calves, both ankles, and both feet completely. The entire lower body below the waist should be glowing warmly. Do NOT leave the lower legs or feet unlit.',

  // OLD body scan prompts (kept for reference, but won't be regenerated)
  // 'bodyscan/face': 'A serene peaceful face outline with closed eyes, soft pink and cream tones, relaxation and calm',
  // 'bodyscan/jaw': 'Abstract gentle jaw shape with soft relaxing waves, light purple and soft blue, releasing tension',
  // 'bodyscan/shoulders': 'Gentle shoulders silhouette with weight lifting off, soft blue and lavender, lightness and release',
  // 'bodyscan/chest': 'Abstract lungs or chest area with soft breathing motion lines, gentle teal and soft blue, deep breath',
  // 'bodyscan/belly': 'Soft circular belly shape with gentle warmth emanating, warm peach and soft orange, comfort and grounding',
  // 'bodyscan/legs': 'Abstract leg shapes with grounding energy flowing down, soft green and earth tones, stability',

  // Grounding senses (5-4-3-2-1 technique)
  'grounding/sight': 'Abstract eye shape with soft light rays, gentle purple and soft blue, awareness and seeing',
  'grounding/touch': 'Gentle open hand with soft energy, warm peach and soft pink, tactile sensation and feeling',
  'grounding/hearing': 'Abstract ear shape with soft sound waves, light blue and soft purple, listening and awareness',
  'grounding/smell': 'Soft nose shape with gentle swirling scent lines, soft green and lavender, pleasant aroma',
  'grounding/taste': 'Abstract tongue or lips with soft taste sensation, warm pink and soft peach, mindful tasting',

  // Gratitude icons
  'gratitude/lightbulb': 'Soft glowing lightbulb with warm gentle light, soft yellow and cream, insight and ideas',
  'gratitude/prayer': 'Hands together in prayer or gratitude position, soft purple and warm peach, thankfulness',
  'gratitude/star': 'Soft glowing star with gentle sparkles, warm gold and soft yellow, celebration and joy',
  'gratitude/checkmark': 'Soft rounded checkmark with gentle glow, soft green and mint, completion and success',

  // General feedback icons
  'icons/success': 'Soft checkmark in a circle with gentle glow, soft green and mint, success and completion',
  'icons/insight': 'Soft lightbulb with warm emanating glow, soft yellow and cream, ideas and understanding',
  'icons/target': 'Soft concentric circles with gentle focus, soft purple and lavender, focus and importance',
  'icons/meditation': 'Peaceful seated meditation figure silhouette, soft purple and lavender, mindfulness and calm',

  // App header/branding
  'branding/header': 'Wide horizontal banner showing a soft abstract group of people embracing in a supportive circle, similar to family silhouettes, using soft pastel yellow, teal, purple gradients. Minimalist, calming, represents support and connection. Wide aspect ratio suitable for header banner (4:1 ratio). Soft gradient background from light lavender to cream.',

  // Kan BaGuf tool - Somatic Body Focusing Exercise (כאן בגוף)
  'tools/kanbaguf': 'Abstract peaceful human body silhouette in warm tones, soft coral (#E11D48), warm pink (#F9A8D4), and gentle orange gradients. A subtle glowing point of light or warmth radiating from the center of the body, representing somatic awareness and body-focused attention. The figure is standing in a relaxed, grounded pose. Gentle warm heatmap-like glow suggests inner body awareness. Calming watercolor style, representing mindful body connection and emotional regulation through physical sensation',

  // The Wall (מילים שקשה להגיד) - CFT Compassion Barriers Exercise
  'tools/wall': 'A soft protective wall or barrier with a gentle crack of warm golden light breaking through, representing compassion barriers and self-protection that can slowly soften. Deep night blue and indigo tones for the wall with warm amber-gold light seeping through the crack. The wall has a watercolor texture, slightly rounded edges, not harsh or rigid. Symbolizes protective walls we build that can gradually open to let compassion in. Hopeful and gentle mood, acknowledging both the need for protection and the possibility of openness',

  // Three Circles (שלושת המעגלים) - Guided Audio Mindfulness
  'tools/threecircles': 'Three soft concentric circles in muted sage green tones (#C4C9C0, #ADB5A8, #8B9383), gently pulsing or breathing, representing mindfulness and inner peace. Soft warm cream background. The circles have a gentle watercolor texture, slightly translucent, overlapping beautifully. Calming, meditative mood, representing guided audio meditation with visual focus',

  // Leaves on Stream tool - ACT Defusion Exercise
  'tools/leavesstream': 'Abstract flowing stream with autumn leaves floating gently on water, soft teal and mint green tones, peaceful nature scene, representing thoughts flowing by, acceptance and mindfulness, calming watercolor style',

  // Conversation Simulator tool - Difficult Conversations Practice
  'tools/simulator': 'Two abstract human silhouettes facing each other with gentle speech bubbles or communication waves between them, soft pink and magenta tones (#F472B6, #EC4899), representing dialogue and connection. A subtle heart or bridge connecting them symbolizes NVC (nonviolent communication). Calming watercolor style, supportive and warm atmosphere, representing practicing difficult conversations safely',

  // ============================================
  // CONVERSATION SIMULATOR - CATEGORY ICONS
  // ============================================

  // Category: Partner/Spouse (💑)
  'simulator/category-partner': 'Two adult figures standing close together in a loving embrace, soft pink and rose tones (#EC4899), romantic couple silhouette, warm and intimate atmosphere, representing partnership and romantic relationships. Minimalist watercolor style, gentle and supportive mood',

  // Category: Teenagers (🧑‍🎓)
  'simulator/category-teenagers': 'Young adult figure with backpack or books, soft purple and lavender tones (#8B5CF6), representing adolescence and growth. Slightly edgy but soft style, showing independence and learning. Minimalist watercolor, supportive parenting mood',

  // Category: Children (👶)
  'simulator/category-children': 'Small child figure playing or reaching up, soft warm amber and golden tones (#F59E0B), representing innocence and childhood. Gentle nurturing atmosphere, parent-child relationship. Minimalist watercolor style, warm and protective mood',

  // Category: Family (👨‍👩‍👧)
  'simulator/category-family': 'Group of 3-4 abstract figures of different sizes standing together, soft green and mint tones (#22C55E), representing extended family unity. Supportive group dynamic, multiple generations. Minimalist watercolor style, warm family atmosphere',

  // Category: Friends (🤝)
  'simulator/category-friends': 'Two hands meeting in a supportive handshake or holding gesture, soft blue tones (#3B82F6), representing friendship and connection. Equal partnership, mutual support. Minimalist watercolor style, trustworthy and supportive mood',

  // ============================================
  // CONVERSATION SIMULATOR - TEMPLATE ICONS
  // ============================================

  // Partner Templates
  'simulator/partner-boundaries': 'Abstract gentle boundary line with soft protective space around a figure, pink and coral tones, representing healthy relationship boundaries. Respectful distance with connection, watercolor style',

  'simulator/partner-difficult-news': 'Two figures sitting close, one gently supporting the other, soft muted pink and gray tones with a small heart, representing sharing difficult news with compassion. Tender supportive moment, watercolor style',

  'simulator/partner-conflict': 'Abstract balance scale with two hearts on each side, soft pink and neutral tones, representing finding balance in relationship conflicts. Fairness and mutual understanding, watercolor style',

  'simulator/partner-needs': 'Glowing heart with gentle rays emanating outward, warm pink and rose tones, representing expressing emotional needs. Open heart communication, vulnerable but safe, watercolor style',

  // Teenager Templates
  'simulator/teen-boundaries': 'Smartphone or device with gentle boundary glow around it, soft purple and blue tones, representing digital boundaries and screen time. Balance between technology and life, watercolor style',

  'simulator/teen-school': 'Open book with soft gentle light coming from pages, purple and lavender tones, representing education and learning challenges. Growth mindset, supportive learning, watercolor style',

  'simulator/teen-friends': 'Group of 3 young silhouettes together, soft purple and blue tones, representing peer relationships and social dynamics. Belonging and social connection, watercolor style',

  // Children Templates
  'simulator/child-divorce': 'Small child figure with two larger protective figures on either side, soft warm amber with gentle stars, representing explaining family changes to children. Safety despite change, watercolor style',

  'simulator/child-fears': 'Soft crescent moon with tiny stars and a small protected figure, gentle amber and soft purple tones, representing childhood fears and comfort. Nighttime safety, soothing atmosphere, watercolor style',

  'simulator/child-behavior': 'Small figure with a gentle target or goal ahead, soft amber and mint tones, representing positive behavior guidance. Encouraging direction, supportive growth, watercolor style',

  // Family Templates
  'simulator/family-aging-parents': 'Elderly figure with gentle supportive hands around them, soft green and warm beige tones, representing caring for aging parents. Respect and gentle care, watercolor style',

  'simulator/family-sibling-conflict': 'Two equal-sized figures facing each other with a bridge forming between them, soft green and teal tones, representing sibling reconciliation. Rebuilding connection, watercolor style',

  'simulator/family-in-laws': 'House outline with multiple family figures, soft green tones with gentle boundaries, representing extended family relationships. Healthy family dynamics, watercolor style',

  // Friends Templates
  'simulator/friend-distance': 'Bridge stretching between two figures with soft mist, blue and soft gray tones, representing reconnecting with distant friends. Distance and hope for reconnection, watercolor style',

  'simulator/friend-support': 'Open hands reaching upward receiving gentle light or support, soft blue and warm peach tones, representing asking for help from friends. Vulnerability and trust, watercolor style',

  'simulator/friend-boundaries': 'Open palm in gentle stop gesture with soft protective glow, blue and light tones, representing healthy friendship boundaries. Kind but firm limits, watercolor style',

  // ============================================
  // CONVERSATION SETUP - PERSON ROLE ICONS
  // ============================================

  // Role: Partner/Spouse (💑)
  'simulator/role-partner': 'Two adult figures standing close together in loving embrace, soft pink and rose tones, romantic couple silhouette with hearts, warm intimate atmosphere. Minimalist watercolor style, circular icon format',

  // Role: Parent (👨‍👩‍👧)
  'simulator/role-parent': 'Adult figure with protective caring posture, soft warm amber and orange tones, representing a parent or caregiver. Nurturing energy, gentle strength. Minimalist watercolor style, circular icon format',

  // Role: Child (👶)
  'simulator/role-child': 'Small young figure with innocent playful energy, soft golden yellow and warm amber tones, representing a child. Youthful, bright, hopeful. Minimalist watercolor style, circular icon format',

  // Role: Sibling (👫)
  'simulator/role-sibling': 'Two figures of similar size standing side by side, soft teal and blue tones, representing siblings or equals. Companionship, shared history. Minimalist watercolor style, circular icon format',

  // Role: Friend (🤝)
  'simulator/role-friend': 'Two hands meeting in friendly handshake or high-five, soft warm peach and coral tones, representing friendship. Trust, support, connection. Minimalist watercolor style, circular icon format',

  // Role: Other (👤)
  'simulator/role-other': 'Single abstract human silhouette, soft neutral gray and blue tones, representing any person. Generic, versatile, approachable. Minimalist watercolor style, circular icon format',

  // ============================================
  // CONVERSATION SETUP - DIFFICULTY ICONS
  // ============================================

  // Difficulty: Easy (🌱)
  'simulator/difficulty-easy': 'Small sprouting seedling with two leaves, soft fresh green tones, representing new growth and easy beginnings. Gentle, encouraging, hopeful. Minimalist watercolor style, circular icon format',

  // Difficulty: Medium (⚖️)
  'simulator/difficulty-medium': 'Balanced scale or balance symbol, soft purple and lavender tones, representing balance and moderate challenge. Fair, realistic, achievable. Minimalist watercolor style, circular icon format',

  // Difficulty: Hard (🔥)
  'simulator/difficulty-hard': 'Gentle flame or fire symbol, soft orange and coral red tones, representing challenge and intensity. Energetic but not aggressive, motivating. Minimalist watercolor style, circular icon format',

  // ============================================
  // EMOTION TREND ICONS (10 basic emotions)
  // ============================================

  // Happy - Joy, contentment, positivity
  'emotions/happy': 'Radiant soft sun with gentle warm rays, bright golden yellow and soft orange tones, representing joy and happiness. Warm glowing energy, uplifting feeling. Minimalist watercolor style, circular icon format, soft pastel aesthetic',

  // Sad - Melancholy, grief, sorrow
  'emotions/sad': 'Single gentle teardrop or soft raindrop falling, deep blue and soft purple tones, representing sadness with compassion. Gentle, not dramatic, acknowledging emotion. Minimalist watercolor style, circular icon format, soft pastel aesthetic',

  // Angry - Frustration, irritation, intensity
  'emotions/angry': 'Abstract soft flame or warm energy shape, coral red and warm orange tones, representing strong emotion with control. Intense but not aggressive, contained energy. Minimalist watercolor style, circular icon format, soft pastel aesthetic',

  // Calm - Peace, tranquility, serenity
  'emotions/calm': 'Gentle flowing water ripple or peaceful wave, soothing teal and soft mint green tones, representing inner peace. Serene, balanced, grounded. Minimalist watercolor style, circular icon format, soft pastel aesthetic',

  // Lonely - Isolation, disconnection, solitude
  'emotions/lonely': 'Single small figure or silhouette with soft space around, muted purple and soft lavender tones, representing solitude with compassion. Gentle, acknowledging, not dramatic. Minimalist watercolor style, circular icon format, soft pastel aesthetic',

  // Tired - Exhaustion, fatigue, low energy
  'emotions/tired': 'Soft drooping crescent moon or gentle fading cloud, slate gray-blue and soft purple tones, representing low energy with understanding. Restful, accepting, gentle. Minimalist watercolor style, circular icon format, soft pastel aesthetic',

  // Bored - Disinterest, monotony, restlessness
  'emotions/bored': 'Abstract soft spiral or static shape, muted sage green and soft olive tones, representing stillness and waiting. Neutral, patient, understated. Minimalist watercolor style, circular icon format, soft pastel aesthetic',

  // Curious - Interest, wonder, exploration
  'emotions/curious': 'Soft magnifying glass or gentle question mark shape, warm orange and soft peach tones, representing exploration and interest. Open, inviting, engaged. Minimalist watercolor style, circular icon format, soft pastel aesthetic',

  // Excited - Enthusiasm, anticipation, high energy
  'emotions/excited': 'Gentle starburst or soft sparkles, vibrant pink and soft magenta tones, representing positive anticipation and enthusiasm. Joyful, energetic, uplifting. Minimalist watercolor style, circular icon format, soft pastel aesthetic',

  // Tense - Anxiety, worry, stress
  'emotions/tense': 'Soft zigzag or gentle lightning shape, light purple and soft violet tones, representing nervous energy with compassion. Alert, sensitive, acknowledged. Minimalist watercolor style, circular icon format, soft pastel aesthetic',

  // ============================================
  // KAN BAGUF - BODY SILHOUETTES (כאן בגוף)
  // ============================================

  'kanbaguf/silhouette-male': `Standing MALE human figure in a relaxed, natural pose, facing forward.
Soft line art / watercolor style with minimal anatomical detail. Arms slightly away from body, legs slightly apart.
Light warm pink/rose gradient background (#FFF0F3 to #FFE4E8).
The body outline should be soft rose (#9F1239) with very subtle shading to show body regions:
head, neck, shoulders, chest, stomach, pelvis, arms, and legs.
No facial features - just a peaceful, calm silhouette outline.
The style should match a therapeutic/somatic body awareness exercise.
Portrait format, centered, full body visible from head to feet.
Soft watercolor feel, gentle and calming, suitable for a mental health app.
IMPORTANT: Match the exact same art style as the female version — same line weight,
same background gradient, same level of detail, same color palette (#9F1239 outline on #FFF0F3-#FFE4E8 background).
The only difference should be masculine body proportions (broader shoulders, narrower hips, no curves).`,

  'kanbaguf/silhouette-female': `Standing female human figure in a relaxed, natural pose, facing forward.
Soft line art style with minimal anatomical detail. Arms slightly away from body, legs slightly apart.
Light warm pink/rose gradient background (#FFF0F3 to #FFE4E8).
The body outline should be soft rose (#9F1239) with very subtle shading to show body regions:
head, neck, shoulders, chest, stomach, pelvis, arms, and legs.
No facial features - just a peaceful, calm silhouette outline.
The style should match a therapeutic/somatic body awareness exercise.
Portrait format, centered, full body visible from head to feet.
Soft watercolor feel, gentle and calming, suitable for a mental health app.`,

  'leavesstream/river': 'Beautiful gentle stream or river viewed from slight angle, clear turquoise and teal water flowing peacefully, soft ripples and reflections, lush green foliage on banks, dappled sunlight, serene nature scene, photorealistic but dreamy quality, calming meditation background, vertical phone wallpaper format',
  'leavesstream/leaf-green': 'Digital sticker of a single autumn maple leaf, sage green color with darker green veins, clean sharp edges, die-cut sticker style, isolated on pure white background #FFFFFF, no shadows, flat design, the leaf fills the frame',
  'leavesstream/leaf-orange': 'Digital sticker of a single autumn maple leaf, warm orange and amber color with darker orange veins, clean sharp edges, die-cut sticker style, isolated on pure white background #FFFFFF, no shadows, flat design, the leaf fills the frame',
  'leavesstream/leaf-red': 'Digital sticker of a single autumn maple leaf, deep crimson red color with darker burgundy veins, clean sharp edges, die-cut sticker style, isolated on pure white background #FFFFFF, no shadows, flat design, the leaf fills the frame',
  'leavesstream/leaf-yellow': 'Digital sticker of a single autumn maple leaf, bright golden yellow color with orange-yellow veins, clean sharp edges, die-cut sticker style, isolated on pure white background #FFFFFF, no shadows, flat design, the leaf fills the frame',
  'leavesstream/stream-intro': 'Person sitting peacefully by a gentle stream in nature, back view silhouette, soft pastel colors, peaceful meditation scene, calming atmosphere, watercolor style',
};

async function generateImage(imageId, prompt) {
  const fullPrompt = STYLE_PREFIX + prompt;

  console.log(`\n🎨 Generating: ${imageId}`);

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: fullPrompt }]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const parts = result.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(part => part.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new Error('No image data in Gemini response');
  }

  return imagePart.inlineData.data;
}

async function uploadToSupabase(imageId, base64Data) {
  const storagePath = `${imageId}.png`;
  const binaryData = Buffer.from(base64Data, 'base64');

  console.log(`   📤 Uploading to Supabase Storage...`);

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/lavie-illustrations/${storagePath}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: binaryData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${errorText}`);
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/lavie-illustrations/${storagePath}`;
  return publicUrl;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         Generating Lavie Illustrations with Gemini             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const allImageIds = Object.keys(IMAGE_PROMPTS);
  // Filter out already generated images
  const imageIds = allImageIds.filter(id => !ALREADY_GENERATED.includes(id));

  console.log(`\n📦 Total images defined: ${allImageIds.length}`);
  console.log(`✅ Already generated: ${ALREADY_GENERATED.length}`);
  console.log(`🎨 Will generate: ${imageIds.length} new images\n`);

  if (imageIds.length === 0) {
    console.log('✨ All images already generated! Nothing to do.');
    return;
  }

  const results = [];
  let generatedCount = 0;

  for (let i = 0; i < imageIds.length; i++) {
    const imageId = imageIds[i];
    const prompt = IMAGE_PROMPTS[imageId];

    try {
      // Rate limiting - wait between requests
      if (generatedCount > 0) {
        console.log(`   ⏳ Waiting 3 seconds (rate limiting)...`);
        await sleep(3000);
      }

      const base64Data = await generateImage(imageId, prompt);
      const url = await uploadToSupabase(imageId, base64Data);

      console.log(`   ✅ Success: ${url}`);
      results.push({ id: imageId, url, success: true });
      generatedCount++;

    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.push({ id: imageId, error: error.message, success: false });
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Successful: ${successful.length}/${imageIds.length}`);
  if (successful.length > 0) {
    successful.forEach(r => console.log(`   - ${r.id}`));
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${imageIds.length}`);
    failed.forEach(r => console.log(`   - ${r.id}: ${r.error}`));
  }

  console.log('\n' + '═'.repeat(60));

  if (successful.length === imageIds.length) {
    console.log('🎉 All images generated successfully!');
    console.log('\nThe app will now show the generated illustrations instead of emojis.');
  } else if (successful.length > 0) {
    console.log('⚠️  Some images generated. You can re-run the script to retry failed ones.');
  } else {
    console.log('❌ No images were generated. Please check the errors above.');
  }
}

main().catch(console.error);
