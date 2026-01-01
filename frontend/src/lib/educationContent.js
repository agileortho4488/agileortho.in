// Research-backed education content for orthopaedic conditions
// Sources: OrthoInfo (AAOS), NHS, Mayo Clinic, Cleveland Clinic, BMJ, Spine Journal

export const TOPIC_CONTENT = {
  // ========== KNEE & SPORTS ==========
  "acl-tear": {
    title: "ACL Tear (Anterior Cruciate Ligament Injury)",
    keyTakeaways: [
      "ACL tears commonly occur during sports involving sudden stops, jumps, or direction changes",
      "Many patients report hearing a 'pop' at the time of injury",
      "Treatment ranges from physical therapy to surgical reconstruction depending on activity level",
      "Full recovery after ACL surgery typically takes 6-12 months"
    ],
    whatIsIt: `The anterior cruciate ligament (ACL) is one of the key ligaments that helps stabilize your knee joint. The ACL connects your thighbone (femur) to your shinbone (tibia). It's most commonly torn during sports that involve sudden stops and changes in direction — such as basketball, soccer, tennis, and volleyball.

An ACL injury is a tear or sprain of the ACL. The severity ranges from a mild sprain (Grade 1) where the ligament is slightly stretched but still intact, to a complete tear (Grade 3) where the ligament is torn into two pieces.

According to research published in the Journal of Bone and Joint Surgery, approximately 200,000 ACL injuries occur annually in the United States alone, with about half requiring surgical reconstruction.`,
    symptoms: [
      "A loud 'pop' or popping sensation in the knee at the time of injury",
      "Severe pain and inability to continue activity",
      "Rapid swelling within the first few hours",
      "Loss of range of motion",
      "Feeling of instability or 'giving way' when bearing weight",
      "Tenderness along the joint line"
    ],
    causes: [
      "Sudden deceleration combined with cutting or pivoting maneuvers",
      "Landing awkwardly from a jump",
      "Direct contact or collision (less common)",
      "Hyperextension of the knee",
      "Stopping suddenly while running"
    ],
    riskFactors: [
      "Female athletes (2-8 times higher risk due to anatomical and hormonal factors)",
      "Participation in high-risk sports (soccer, basketball, football, skiing)",
      "Poor conditioning or muscle weakness",
      "Using improper movement patterns",
      "Playing on artificial turf",
      "Wearing ill-fitting footwear"
    ],
    treatment: {
      nonSurgical: [
        "RICE protocol (Rest, Ice, Compression, Elevation) immediately after injury",
        "Physical therapy to strengthen surrounding muscles",
        "Knee bracing for stability during activities",
        "Activity modification - avoiding high-risk sports"
      ],
      surgical: [
        "ACL reconstruction using tissue graft (autograft or allograft)",
        "Arthroscopic surgery (minimally invasive)",
        "Graft options include patellar tendon, hamstring tendon, or quadriceps tendon",
        "Surgery typically recommended for active individuals who want to return to sports"
      ]
    },
    recovery: `Recovery from ACL reconstruction follows a structured rehabilitation program:

**Phase 1 (Weeks 1-2):** Focus on reducing swelling, restoring range of motion, and regaining quadriceps control.

**Phase 2 (Weeks 2-6):** Progressive strengthening, full extension, and walking without crutches.

**Phase 3 (Months 2-4):** Advanced strengthening, balance training, and beginning light jogging.

**Phase 4 (Months 4-6):** Sport-specific training and agility work.

**Return to Sports (6-12 months):** Full clearance typically requires passing functional tests and achieving adequate strength ratios.`,
    prevention: [
      "Neuromuscular training programs (like FIFA 11+)",
      "Strengthening hip and core muscles",
      "Proper landing techniques with knees over toes",
      "Adequate warm-up before activity",
      "Maintaining flexibility in hips and legs"
    ],
    references: [
      "American Academy of Orthopaedic Surgeons (AAOS) - OrthoInfo",
      "Journal of Bone and Joint Surgery",
      "British Journal of Sports Medicine"
    ]
  },

  "meniscal-tears": {
    title: "Meniscal Tears (Meniscus Injury)",
    keyTakeaways: [
      "The meniscus acts as a shock absorber between your thighbone and shinbone",
      "Tears can occur from acute injury or gradual degeneration with age",
      "Not all meniscal tears require surgery - many heal with conservative treatment",
      "Preserving the meniscus is important for long-term knee health"
    ],
    whatIsIt: `The meniscus is a C-shaped piece of tough, rubbery cartilage that acts as a shock absorber between your shinbone and thighbone. Each knee has two menisci - one on the inner side (medial) and one on the outer side (lateral).

A torn meniscus is one of the most common knee injuries. Any activity that causes you to forcefully twist or rotate your knee, especially when putting full weight on it, can lead to a torn meniscus.

Research indicates that the outer one-third of the meniscus has a good blood supply (the "red zone") and can often heal with conservative treatment, while tears in the inner two-thirds (the "white zone") have limited healing capacity.`,
    symptoms: [
      "Pain, especially when twisting or rotating the knee",
      "Swelling or stiffness that develops over 24-48 hours",
      "Difficulty straightening the knee fully",
      "Feeling as if the knee is locked or catching",
      "Sensation of the knee giving way",
      "Popping sensation at the time of injury"
    ],
    causes: [
      "Acute trauma from twisting or pivoting movements",
      "Deep squatting or kneeling",
      "Heavy lifting with rotational stress",
      "Age-related degeneration (degenerative tears)",
      "Direct impact to the knee"
    ],
    riskFactors: [
      "Age over 30 (degenerative tears become more common)",
      "Participation in contact sports",
      "Obesity (increased stress on knee joint)",
      "Previous knee injuries",
      "Occupations requiring frequent squatting or kneeling"
    ],
    treatment: {
      nonSurgical: [
        "RICE protocol in the acute phase",
        "Anti-inflammatory medications (NSAIDs)",
        "Physical therapy to strengthen supporting muscles",
        "Corticosteroid injections for pain relief",
        "Activity modification"
      ],
      surgical: [
        "Arthroscopic meniscectomy (partial removal of torn tissue)",
        "Meniscal repair (suturing the torn edges together)",
        "Meniscal transplant (for severe cases in younger patients)",
        "Surgery typically done arthroscopically with small incisions"
      ]
    },
    recovery: `**Conservative Treatment:** 4-6 weeks of physical therapy, with gradual return to activities.

**Meniscectomy:** Return to daily activities in 1-2 weeks; full recovery in 4-6 weeks.

**Meniscal Repair:** More restrictive - 4-6 weeks limited weight bearing, 3-6 months before return to sports.`,
    prevention: [
      "Strengthening quadriceps and hamstring muscles",
      "Maintaining healthy body weight",
      "Using proper techniques during sports",
      "Wearing appropriate footwear",
      "Warming up before physical activity"
    ],
    references: [
      "American Academy of Orthopaedic Surgeons (AAOS)",
      "Arthroscopy Journal",
      "Cleveland Clinic"
    ]
  },

  "knee-osteoarthritis": {
    title: "Knee Osteoarthritis",
    keyTakeaways: [
      "Osteoarthritis is the most common form of arthritis, affecting millions worldwide",
      "It involves gradual wearing away of cartilage in the knee joint",
      "Symptoms typically develop slowly and worsen over years",
      "Many treatment options exist before considering knee replacement"
    ],
    whatIsIt: `Knee osteoarthritis (OA) is a degenerative joint disease where the protective cartilage that cushions the ends of the bones in the knee joint gradually wears away. As the cartilage deteriorates, the bones begin to rub against each other, causing pain, stiffness, and swelling.

The knee is one of the most commonly affected joints. OA typically affects people over age 50, though it can occur earlier, especially after injury. It is one of the leading causes of disability in older adults.`,
    symptoms: [
      "Pain that increases with activity and improves with rest",
      "Stiffness, especially in the morning or after sitting",
      "Swelling around the knee joint",
      "Grinding or crackling sensation (crepitus) with movement",
      "Decreased range of motion",
      "Feeling of weakness or buckling"
    ],
    causes: [
      "Age-related wear and tear",
      "Previous knee injuries (fractures, ligament tears, meniscus injuries)",
      "Repetitive stress from occupation or sports",
      "Obesity (extra weight stresses knee joints)",
      "Genetic factors"
    ],
    riskFactors: [
      "Age over 50",
      "Female gender (higher risk after menopause)",
      "Obesity",
      "Previous knee injuries",
      "Family history of osteoarthritis",
      "Occupations with repetitive knee stress"
    ],
    treatment: {
      nonSurgical: [
        "Weight management - every pound lost reduces knee load by 4 pounds",
        "Low-impact exercise (swimming, cycling, walking)",
        "Physical therapy for strength and flexibility",
        "NSAIDs and acetaminophen for pain relief",
        "Corticosteroid injections",
        "Hyaluronic acid injections (viscosupplementation)",
        "Bracing and assistive devices"
      ],
      surgical: [
        "Arthroscopic debridement (limited benefit for OA)",
        "Osteotomy (realigning the knee to shift weight)",
        "Partial knee replacement (unicompartmental)",
        "Total knee replacement (most effective for severe OA)"
      ]
    },
    recovery: `**Conservative Management:** Ongoing lifestyle modifications with medication as needed. Many patients manage symptoms effectively for years.

**Knee Replacement:** Hospital stay 1-3 days; walking with assistance same day; 6-12 weeks to resume normal activities; full recovery 3-6 months. Modern implants last 15-20+ years.`,
    prevention: [
      "Maintain healthy weight",
      "Stay physically active with low-impact exercises",
      "Strengthen muscles around the knee",
      "Protect knees from injury",
      "Address injuries promptly"
    ],
    references: [
      "Arthritis Foundation",
      "American Academy of Orthopaedic Surgeons",
      "The Lancet - Osteoarthritis"
    ]
  },

  // ========== SPINE ==========
  "lumbar-disc-herniation": {
    title: "Herniated Disc (Slipped Disc)",
    keyTakeaways: [
      "A herniated disc occurs when the soft center pushes through the tough outer ring",
      "Most common in the lower back (lumbar spine) but can occur in the neck",
      "80-90% of patients improve with conservative treatment within 6-12 weeks",
      "Surgery is only needed when conservative treatments fail or neurological symptoms worsen"
    ],
    whatIsIt: `A herniated disc (also called slipped disc, ruptured disc, or prolapsed disc) occurs when the soft, gel-like center (nucleus pulposus) of a spinal disc pushes through a tear in the tough outer ring (annulus fibrosus).

Your spine is made up of 33 vertebrae stacked on top of each other. Between each vertebra are intervertebral discs that act as cushions or shock absorbers. These discs have a tough, fibrous outer layer and a soft, jelly-like center.

When a disc herniates, it can press on nearby nerves, causing pain, numbness, or weakness. The most common locations are L4-L5 and L5-S1 in the lumbar spine (causing sciatica) and C5-C6 and C6-C7 in the cervical spine (causing arm symptoms).`,
    symptoms: [
      "Sharp, burning pain in the back, buttock, or leg (sciatica)",
      "Numbness or tingling that radiates into the limbs",
      "Muscle weakness in the affected area",
      "Pain that worsens with sitting, coughing, or sneezing",
      "Difficulty standing or walking",
      "In severe cases: bladder or bowel dysfunction (medical emergency)"
    ],
    causes: [
      "Age-related disc degeneration (most common)",
      "Improper lifting technique with back instead of legs",
      "Trauma or injury to the spine",
      "Repetitive motions that strain the spine",
      "Sudden forceful movements"
    ],
    riskFactors: [
      "Age 35-55 (discs naturally weaken with age)",
      "Excess body weight",
      "Sedentary lifestyle",
      "Smoking (reduces oxygen supply to discs)",
      "Occupations requiring heavy lifting",
      "Genetic predisposition"
    ],
    treatment: {
      nonSurgical: [
        "Short period of rest (1-2 days maximum)",
        "Physical therapy and core strengthening",
        "NSAIDs and muscle relaxants",
        "Epidural steroid injections",
        "Hot/cold therapy",
        "Activity modification"
      ],
      surgical: [
        "Microdiscectomy (minimally invasive removal of disc fragment)",
        "Laminectomy (removal of bone to relieve pressure)",
        "Spinal fusion (in cases of instability)",
        "Artificial disc replacement (selected cases)"
      ]
    },
    recovery: `**Conservative Treatment:** Most patients see significant improvement within 4-6 weeks. Full recovery typically occurs within 3 months.

**Post-Surgery (Microdiscectomy):** Weeks 1-2 limited activity; Weeks 2-6 gradual increase in activities; 6-12 weeks physical therapy; 3-6 months return to normal activities. Success rate 85-90% for relieving leg pain.`,
    prevention: [
      "Maintain good posture while sitting and standing",
      "Use proper lifting technique (lift with legs)",
      "Maintain healthy weight",
      "Exercise regularly with focus on core strengthening",
      "Quit smoking",
      "Take breaks during prolonged sitting"
    ],
    references: [
      "North American Spine Society",
      "American Academy of Orthopaedic Surgeons",
      "Spine Journal"
    ]
  },

  "sciatica": {
    title: "Sciatica (Lumbar Radiculopathy)",
    keyTakeaways: [
      "Sciatica refers to pain that radiates along the path of the sciatic nerve",
      "It's usually caused by a herniated disc or bone spur compressing the nerve",
      "Most cases resolve with conservative treatment within 4-6 weeks",
      "Red flags requiring immediate attention include bladder/bowel dysfunction"
    ],
    whatIsIt: `Sciatica is a term used to describe nerve pain in the leg caused by irritation or compression of the sciatic nerve. The sciatic nerve is the longest and largest nerve in your body, running from your lower back through your hips and buttocks and down each leg.

Sciatica most commonly occurs when a herniated disk, bone spur, or spinal stenosis compresses part of the nerve. This causes inflammation, pain, and often some numbness in the affected leg.

While the pain can be severe, most cases of sciatica resolve with non-operative treatments within a few weeks.`,
    symptoms: [
      "Pain radiating from lower back through buttock and down the leg",
      "Pain that worsens with sitting, coughing, or sneezing",
      "Numbness, tingling, or muscle weakness in the leg or foot",
      "Sharp, shooting, or burning pain",
      "Difficulty moving the leg or foot",
      "Constant pain on one side of the buttock"
    ],
    causes: [
      "Herniated or bulging disc (most common)",
      "Spinal stenosis (narrowing of the spinal canal)",
      "Degenerative disc disease",
      "Spondylolisthesis (slipped vertebra)",
      "Piriformis syndrome",
      "Spinal tumors (rare)"
    ],
    riskFactors: [
      "Age (disc changes are common cause)",
      "Obesity",
      "Prolonged sitting",
      "Diabetes (increases nerve damage risk)",
      "Occupation involving heavy lifting or prolonged driving"
    ],
    treatment: {
      nonSurgical: [
        "Over-the-counter pain medications (NSAIDs, acetaminophen)",
        "Hot and cold therapy",
        "Physical therapy and stretching exercises",
        "Epidural steroid injections",
        "Oral steroids for acute flares",
        "Activity modification (avoid prolonged sitting)"
      ],
      surgical: [
        "Microdiscectomy if caused by herniated disc",
        "Laminectomy for spinal stenosis",
        "Surgery considered after 6-12 weeks of failed conservative care",
        "Emergency surgery for cauda equina syndrome"
      ]
    },
    recovery: `**Conservative Treatment:** 80-90% of patients improve within 4-6 weeks with non-surgical care.

**Post-Surgery:** Most patients experience immediate relief of leg pain. Return to light activities in 2-4 weeks, full activities in 6-12 weeks.`,
    prevention: [
      "Regular exercise focusing on core and back strength",
      "Maintain proper posture",
      "Use proper body mechanics when lifting",
      "Avoid prolonged sitting",
      "Maintain healthy weight"
    ],
    references: [
      "American Academy of Orthopaedic Surgeons",
      "Mayo Clinic",
      "National Institute of Neurological Disorders and Stroke"
    ]
  },

  "spinal-stenosis": {
    title: "Spinal Stenosis",
    keyTakeaways: [
      "Spinal stenosis is narrowing of the spaces within your spine",
      "Most common in people over 50 due to age-related changes",
      "Symptoms often develop gradually and may worsen over time",
      "Many patients find relief by leaning forward or sitting"
    ],
    whatIsIt: `Spinal stenosis is a condition in which the spaces within the spine narrow, putting pressure on the nerves that travel through the spine. It most commonly occurs in the lower back (lumbar stenosis) and neck (cervical stenosis).

Lumbar spinal stenosis is one of the most common causes of leg pain in people over 60. The narrowing is usually caused by age-related changes including thickened ligaments, bulging discs, and bone spurs.

A characteristic symptom is "neurogenic claudication" - leg pain and weakness that occurs with walking and is relieved by sitting or leaning forward.`,
    symptoms: [
      "Pain in back or neck",
      "Numbness, tingling, or weakness in legs or arms",
      "Leg cramping when standing or walking (claudication)",
      "Relief when sitting, bending forward, or leaning on shopping cart",
      "Difficulty with balance",
      "In severe cases: bladder or bowel problems"
    ],
    causes: [
      "Osteoarthritis and bone spurs",
      "Thickened ligaments (ligamentum flavum)",
      "Herniated or bulging discs",
      "Spinal injuries",
      "Tumors (rare)",
      "Congenital spinal stenosis (born with narrow spinal canal)"
    ],
    riskFactors: [
      "Age over 50",
      "Previous spine injury",
      "Congenitally narrow spinal canal",
      "Conditions affecting bone growth"
    ],
    treatment: {
      nonSurgical: [
        "Physical therapy focusing on flexion-based exercises",
        "NSAIDs and pain medications",
        "Epidural steroid injections",
        "Activity modification",
        "Assistive devices (walker, cane)",
        "Weight management"
      ],
      surgical: [
        "Laminectomy (decompression surgery)",
        "Laminotomy (partial removal of lamina)",
        "Spinal fusion (if instability present)",
        "Interspinous spacers (minimally invasive option)"
      ]
    },
    recovery: `**Conservative Treatment:** Many patients manage symptoms well with physical therapy and lifestyle modifications.

**Post-Surgery:** Hospital stay 1-3 days; walking same day; 4-6 weeks to resume normal activities; full recovery 3-6 months. Success rate 70-90% for leg pain relief.`,
    prevention: [
      "Regular exercise to maintain spine flexibility",
      "Good posture",
      "Healthy weight maintenance",
      "Core strengthening exercises",
      "Avoid smoking"
    ],
    references: [
      "North American Spine Society",
      "American Academy of Orthopaedic Surgeons",
      "Spine Journal"
    ]
  },

  // ========== SHOULDER ==========
  "rotator-cuff-tear": {
    title: "Rotator Cuff Tear",
    keyTakeaways: [
      "The rotator cuff is a group of four muscles and tendons that stabilize the shoulder",
      "Tears can be acute (from injury) or chronic (from wear over time)",
      "Not all rotator cuff tears cause pain or require surgery",
      "Physical therapy is often effective, especially for partial tears"
    ],
    whatIsIt: `The rotator cuff is a group of four muscles and their tendons that form a "cuff" over the shoulder joint. These muscles (supraspinatus, infraspinatus, teres minor, and subscapularis) work together to lift and rotate the arm and stabilize the ball of the shoulder within the joint.

A rotator cuff tear occurs when one or more of these tendons is torn from the bone. The supraspinatus tendon is most commonly affected. According to research, rotator cuff tears affect up to 30% of people over age 60, though many are asymptomatic.`,
    symptoms: [
      "Pain at rest and at night, especially when lying on the affected side",
      "Pain when lifting or lowering the arm",
      "Weakness when lifting or rotating the arm",
      "Crackling sensation when moving the shoulder",
      "Difficulty reaching behind the back"
    ],
    causes: [
      "Acute injury (fall on outstretched arm, lifting heavy objects)",
      "Chronic degeneration from repetitive overhead activities",
      "Bone spurs that rub on the tendon",
      "Decreased blood supply to the tendon with age"
    ],
    riskFactors: [
      "Age over 40",
      "Occupations with repetitive overhead work",
      "Sports involving overhead motions",
      "Family history",
      "Smoking"
    ],
    treatment: {
      nonSurgical: [
        "Rest and activity modification",
        "NSAIDs for pain and inflammation",
        "Physical therapy to strengthen remaining muscles",
        "Corticosteroid injections (limited use)",
        "PRP injections (emerging treatment)"
      ],
      surgical: [
        "Arthroscopic tendon repair (most common)",
        "Open tendon repair (for large or complex tears)",
        "Tendon transfer (when tear cannot be repaired)",
        "Shoulder replacement (for severe arthritis with massive tears)"
      ]
    },
    recovery: `**Conservative Treatment:** Many patients improve significantly with 6-12 weeks of physical therapy.

**Post-Surgery:** Sling for 4-6 weeks; passive motion exercises starting week 1; active motion at 6 weeks; strengthening at 3 months; full recovery 6-12 months.`,
    prevention: [
      "Strengthen shoulder and back muscles",
      "Stretch before activities",
      "Use proper technique for overhead movements",
      "Take breaks during repetitive activities"
    ],
    references: [
      "American Academy of Orthopaedic Surgeons",
      "Journal of Shoulder and Elbow Surgery"
    ]
  },

  "frozen-shoulder": {
    title: "Frozen Shoulder (Adhesive Capsulitis)",
    keyTakeaways: [
      "Frozen shoulder causes stiffness and pain that limits shoulder movement",
      "The condition typically goes through three stages over 1-3 years",
      "It commonly affects people between ages 40-60, especially women",
      "Most cases eventually resolve, though it can take up to 3 years"
    ],
    whatIsIt: `Frozen shoulder, also known as adhesive capsulitis, is a condition characterized by stiffness and pain in the shoulder joint. The capsule of connective tissue that surrounds the shoulder joint becomes thickened and tight, with less synovial fluid to lubricate the joint.

The condition typically develops slowly and goes through three stages:
1. **Freezing stage** (6 weeks to 9 months): Pain increases, movement decreases
2. **Frozen stage** (4-6 months): Pain may decrease, but stiffness remains
3. **Thawing stage** (6 months to 2 years): Gradual return of movement`,
    symptoms: [
      "Dull or aching pain in the outer shoulder and upper arm",
      "Progressive loss of range of motion",
      "Difficulty with daily activities (dressing, reaching overhead)",
      "Night pain that disrupts sleep",
      "Pain with sudden movements"
    ],
    causes: [
      "Often unknown (idiopathic)",
      "Immobilization after surgery or injury",
      "Systemic diseases (diabetes, thyroid disorders)",
      "Stroke or Parkinson's disease",
      "Cardiac surgery"
    ],
    riskFactors: [
      "Age 40-60",
      "Female gender (more common in women)",
      "Diabetes (10-20% of diabetics affected)",
      "Thyroid disorders",
      "Recent shoulder surgery or injury",
      "Prolonged immobilization"
    ],
    treatment: {
      nonSurgical: [
        "Physical therapy (most important treatment)",
        "NSAIDs for pain relief",
        "Corticosteroid injections into the joint",
        "Heat therapy before stretching",
        "Hydrodilatation (joint distension)",
        "Home exercise program"
      ],
      surgical: [
        "Manipulation under anesthesia",
        "Arthroscopic capsular release",
        "Surgery reserved for cases not responding to 6+ months of conservative care"
      ]
    },
    recovery: `**Natural Course:** Most cases resolve within 1-3 years, though some permanent limitation may remain.

**With Treatment:** Physical therapy can accelerate recovery. Post-surgical recovery typically 6-12 weeks of intensive therapy.`,
    prevention: [
      "Early physical therapy after shoulder injury or surgery",
      "Maintain shoulder mobility if immobilized",
      "Good blood sugar control in diabetics",
      "Regular shoulder stretching exercises"
    ],
    references: [
      "American Academy of Orthopaedic Surgeons",
      "BMJ Best Practice",
      "Journal of Shoulder and Elbow Surgery"
    ]
  },

  // ========== HIP ==========
  "hip-osteoarthritis": {
    title: "Hip Osteoarthritis",
    keyTakeaways: [
      "Osteoarthritis is the most common form of arthritis affecting the hip",
      "The condition involves gradual wearing away of cartilage in the hip joint",
      "Symptoms typically develop slowly and worsen over time",
      "Hip replacement surgery has excellent outcomes when conservative treatments fail"
    ],
    whatIsIt: `Hip osteoarthritis (OA) is a degenerative joint disease where the protective cartilage that cushions the ends of the bones in the hip joint gradually wears away. As the cartilage deteriorates, the bones begin to rub against each other, causing pain, stiffness, and reduced mobility.

The hip is a ball-and-socket joint where the head of the femur (thighbone) fits into the acetabulum (socket) of the pelvis. Hip OA affects approximately 10% of people over age 60.`,
    symptoms: [
      "Pain in the groin, thigh, or buttock that worsens with activity",
      "Stiffness in the hip, especially in the morning",
      "Reduced range of motion",
      "Grinding sensation with movement",
      "Pain that may radiate to the knee",
      "Limping"
    ],
    causes: [
      "Age-related wear and tear",
      "Previous hip injury",
      "Hip dysplasia",
      "Avascular necrosis",
      "Femoroacetabular impingement"
    ],
    riskFactors: [
      "Age over 50",
      "Obesity",
      "Family history",
      "Previous hip injuries",
      "Congenital hip abnormalities"
    ],
    treatment: {
      nonSurgical: [
        "Weight management",
        "Low-impact exercise (swimming, cycling)",
        "Physical therapy",
        "NSAIDs and pain medications",
        "Corticosteroid injections",
        "Assistive devices"
      ],
      surgical: [
        "Total hip replacement (most effective)",
        "Hip resurfacing (for younger patients)",
        "Osteotomy (bone realignment)"
      ]
    },
    recovery: `**Conservative:** Ongoing lifestyle modifications with many patients managing well for years.

**Hip Replacement:** Walking with assistance day 1; home in 1-3 days; driving at 4-6 weeks; full recovery 3-6 months. 95% implant survival at 15-20 years.`,
    prevention: [
      "Maintain healthy weight",
      "Stay physically active",
      "Strengthen hip muscles",
      "Address injuries early"
    ],
    references: [
      "Arthritis Foundation",
      "American Academy of Orthopaedic Surgeons",
      "Journal of Arthroplasty"
    ]
  },

  // ========== HAND & WRIST ==========
  "carpal-tunnel-syndrome": {
    title: "Carpal Tunnel Syndrome",
    keyTakeaways: [
      "Carpal tunnel syndrome is caused by compression of the median nerve at the wrist",
      "It's one of the most common causes of hand numbness and tingling",
      "Symptoms often worse at night and may wake you from sleep",
      "Early treatment can prevent permanent nerve damage"
    ],
    whatIsIt: `Carpal tunnel syndrome (CTS) occurs when the median nerve, which runs from the forearm into the palm of the hand, becomes pressed or squeezed at the wrist. The carpal tunnel is a narrow passageway of ligament and bones at the base of the hand that houses the median nerve and tendons.

The median nerve provides sensation to the thumb, index finger, middle finger, and the thumb side of the ring finger. When this nerve is compressed, it can cause numbness, tingling, weakness, and pain.

CTS is one of the most common nerve disorders, affecting 3-6% of adults.`,
    symptoms: [
      "Numbness or tingling in thumb, index, middle, and ring fingers",
      "Symptoms often worse at night",
      "Pain radiating up the arm",
      "Weakness in the hand and tendency to drop objects",
      "Shock-like sensations in the fingers",
      "Symptoms may be relieved by shaking the hand"
    ],
    causes: [
      "Repetitive hand motions (typing, assembly work)",
      "Wrist anatomy (smaller carpal tunnel)",
      "Fluid retention (pregnancy, menopause)",
      "Medical conditions (diabetes, thyroid disorders, rheumatoid arthritis)",
      "Wrist injury or fracture"
    ],
    riskFactors: [
      "Female gender (3 times more common)",
      "Obesity",
      "Occupations with repetitive wrist movements",
      "Pregnancy",
      "Diabetes",
      "Family history"
    ],
    treatment: {
      nonSurgical: [
        "Wrist splinting, especially at night",
        "NSAIDs for pain relief",
        "Corticosteroid injections",
        "Activity modification",
        "Ergonomic changes at work",
        "Physical therapy and nerve gliding exercises"
      ],
      surgical: [
        "Carpal tunnel release surgery",
        "Can be done open or endoscopically",
        "Releases the ligament pressing on the nerve",
        "Outpatient procedure"
      ]
    },
    recovery: `**Conservative:** Mild cases may resolve with splinting and activity modification in weeks to months.

**Post-Surgery:** Immediate use of fingers for light activities; grip strength returns over weeks to months; full recovery typically 3-6 months. Success rate over 90%.`,
    prevention: [
      "Take frequent breaks from repetitive tasks",
      "Keep wrists in neutral position",
      "Ergonomic keyboard and mouse setup",
      "Stretching exercises",
      "Maintain healthy weight"
    ],
    references: [
      "American Academy of Orthopaedic Surgeons",
      "American Society for Surgery of the Hand",
      "Mayo Clinic"
    ]
  },

  "trigger-finger": {
    title: "Trigger Finger (Stenosing Tenosynovitis)",
    keyTakeaways: [
      "Trigger finger causes a finger to catch or lock when bent",
      "It occurs when inflammation narrows the tendon sheath",
      "Most common in the thumb, middle, or ring finger",
      "Treatment ranges from rest and splinting to minor surgery"
    ],
    whatIsIt: `Trigger finger is a condition in which one of your fingers gets stuck in a bent position and then straightens with a snap — like a trigger being pulled and released. It occurs when inflammation narrows the space within the sheath that surrounds the tendon in the affected finger.

If trigger finger is severe, your finger may become locked in a bent position. People whose work or hobbies require repetitive gripping actions are at higher risk.`,
    symptoms: [
      "Finger stiffness, particularly in the morning",
      "Popping or clicking sensation when moving the finger",
      "Tenderness or bump at the base of the affected finger",
      "Finger catching or locking in a bent position",
      "Finger suddenly popping straight",
      "Finger locked in bent position (in severe cases)"
    ],
    causes: [
      "Repetitive gripping motions",
      "Forceful use of fingers and thumb",
      "Medical conditions (diabetes, rheumatoid arthritis)",
      "Gender (more common in women)"
    ],
    riskFactors: [
      "Age 40-60",
      "Female gender",
      "Diabetes (especially with long-standing disease)",
      "Rheumatoid arthritis",
      "Occupations requiring repetitive gripping",
      "Previous carpal tunnel surgery"
    ],
    treatment: {
      nonSurgical: [
        "Rest and avoiding repetitive gripping",
        "Splinting the finger at night",
        "Stretching exercises",
        "NSAIDs for pain and inflammation",
        "Corticosteroid injections (up to 2)"
      ],
      surgical: [
        "Percutaneous release (needle procedure)",
        "Open trigger finger release",
        "Simple outpatient procedure",
        "Releases the A1 pulley to allow free tendon gliding"
      ]
    },
    recovery: `**Conservative:** Steroid injection effective in 50-70% of cases. May take several weeks.

**Post-Surgery:** Immediate finger movement encouraged; light activities in days; full recovery 2-4 weeks. Success rate over 95%.`,
    prevention: [
      "Avoid prolonged gripping",
      "Take regular breaks during repetitive tasks",
      "Use padded gloves for power tools",
      "Stretching exercises for hands"
    ],
    references: [
      "American Academy of Orthopaedic Surgeons",
      "American Society for Surgery of the Hand"
    ]
  },

  // ========== PEDIATRIC ==========
  "clubfoot": {
    title: "Clubfoot (Talipes Equinovarus)",
    keyTakeaways: [
      "Clubfoot is a birth defect where the foot is twisted out of shape",
      "It affects about 1 in 1,000 babies born worldwide",
      "The Ponseti method (casting) is highly successful with 95%+ success rate",
      "Early treatment in the first few weeks of life gives best results"
    ],
    whatIsIt: `Clubfoot, or talipes equinovarus, is a birth defect in which one or both feet are rotated inward and downward. The foot, calf, and leg may be smaller than normal. If left untreated, the child would walk on the sides or tops of their feet.

Clubfoot is one of the most common birth defects affecting the musculoskeletal system. It occurs in approximately 1-2 per 1,000 live births and is twice as common in boys. In about half of cases, both feet are affected.

With proper treatment started shortly after birth, most children with clubfoot can lead normal, active lives.`,
    symptoms: [
      "Foot points downward and inward (equinovarus position)",
      "Foot may appear to be rotated upside down",
      "Affected leg and foot may be slightly shorter",
      "Calf muscles are underdeveloped",
      "Limited range of motion in the ankle"
    ],
    causes: [
      "Exact cause often unknown (idiopathic)",
      "Genetic factors (runs in families)",
      "Environmental factors during pregnancy",
      "Part of a syndrome (in some cases)"
    ],
    riskFactors: [
      "Family history of clubfoot",
      "Male gender",
      "Smoking during pregnancy",
      "Low amniotic fluid",
      "Certain neuromuscular conditions"
    ],
    treatment: {
      nonSurgical: [
        "Ponseti method (serial casting) - gold standard",
        "Weekly cast changes for 5-7 weeks",
        "Achilles tenotomy (minor procedure) often needed",
        "Foot abduction brace for 4-5 years",
        "French method (physical therapy based)"
      ],
      surgical: [
        "Surgery rarely needed with proper Ponseti treatment",
        "Extensive soft tissue release for resistant cases",
        "Tendon transfers for relapse",
        "Bone procedures for older children"
      ]
    },
    recovery: `**Ponseti Method:** Casting for 5-7 weeks, then bracing. Most children walk normally by age 2. Long-term bracing (night and naps) for 4-5 years prevents relapse.

**Success Rate:** Over 95% success with proper Ponseti treatment and bracing compliance.`,
    prevention: [
      "No known prevention",
      "Avoid smoking during pregnancy",
      "Prenatal vitamins and good nutrition",
      "Genetic counseling if family history"
    ],
    references: [
      "Pediatric Orthopaedic Society of North America",
      "American Academy of Orthopaedic Surgeons",
      "Journal of Pediatric Orthopaedics"
    ]
  },

  "scoliosis": {
    title: "Scoliosis (Spinal Curvature)",
    keyTakeaways: [
      "Scoliosis is a sideways curvature of the spine that most often occurs during growth spurts",
      "Most cases are mild and just need monitoring",
      "Early detection and treatment can prevent progression",
      "Bracing is effective for moderate curves in growing children"
    ],
    whatIsIt: `Scoliosis is a sideways curvature of the spine that occurs most often during the growth spurt just before puberty. While scoliosis can be caused by conditions such as cerebral palsy and muscular dystrophy, the cause of most scoliosis is unknown (idiopathic).

Most cases of scoliosis are mild, but some curves worsen as children grow. Severe scoliosis can be disabling and reduce the amount of space within the chest, making it difficult for the lungs to function properly.

About 3% of adolescents have scoliosis. Of these, about 10% will need treatment.`,
    symptoms: [
      "Uneven shoulders or waist",
      "One hip higher than the other",
      "One shoulder blade more prominent",
      "Ribs protruding more on one side",
      "Head not centered over pelvis",
      "Back pain (in some cases)"
    ],
    causes: [
      "Idiopathic (cause unknown) - most common, ~80%",
      "Congenital (vertebral abnormalities from birth)",
      "Neuromuscular (cerebral palsy, muscular dystrophy)",
      "Degenerative (in adults)"
    ],
    riskFactors: [
      "Age (typically develops before puberty)",
      "Female gender (higher risk of curve progression)",
      "Family history",
      "Growth spurts"
    ],
    treatment: {
      nonSurgical: [
        "Observation for mild curves (<25 degrees)",
        "Bracing for moderate curves (25-40 degrees) in growing children",
        "Physical therapy (Schroth method and others)",
        "Regular monitoring with X-rays"
      ],
      surgical: [
        "Spinal fusion for severe curves (>45-50 degrees)",
        "Growing rods for young children",
        "Vertebral body tethering (newer technique)",
        "Surgery typically done in adolescence"
      ]
    },
    recovery: `**Bracing:** Worn 16-23 hours/day until skeletal maturity. Compliance is key to success.

**Post-Surgery:** Hospital stay 3-5 days; return to school in 4-6 weeks; return to most activities in 6-12 months; full fusion maturation 1-2 years.`,
    prevention: [
      "No known prevention for idiopathic scoliosis",
      "Regular screening during growth years",
      "Early detection and treatment prevents progression",
      "Good posture doesn't prevent scoliosis but is important"
    ],
    references: [
      "Scoliosis Research Society",
      "American Academy of Orthopaedic Surgeons",
      "Pediatric Orthopaedic Society of North America"
    ]
  }
};

// Search synonyms for intelligent search
export const SEARCH_SYNONYMS = {
  // Hindi terms
  "ghutne": ["knee", "घुटने"],
  "ghutna": ["knee"],
  "kamar": ["back", "spine", "कमर", "lower back"],
  "kandha": ["shoulder", "कंधा"],
  "kalai": ["wrist", "कलाई"],
  "haddi": ["bone", "fracture", "हड्डी"],
  "jodon": ["joints", "जोड़ों"],
  "dard": ["pain", "दर्द"],
  "टूटी हड्डी": ["fracture", "broken bone"],
  "गठिया": ["arthritis"],
  
  // Telugu terms
  "mokalu": ["knee"],
  "noppi": ["pain"],
  "vennunoppi": ["back pain"],
  
  // Common medical terms
  "acl": ["anterior cruciate ligament", "acl tear", "acl injury", "ligament tear"],
  "pcl": ["posterior cruciate ligament"],
  "mcl": ["medial collateral ligament"],
  "meniscus": ["meniscal", "meniscus tear", "torn meniscus", "cartilage tear"],
  "rotator": ["rotator cuff", "shoulder tear", "shoulder injury"],
  "slipped disc": ["herniated disc", "disc bulge", "prolapsed disc", "disk"],
  "sciatica": ["leg pain", "nerve pain", "shooting pain", "radiculopathy"],
  "arthritis": ["osteoarthritis", "joint pain", "joint wear", "oa"],
  "replacement": ["arthroplasty", "total knee", "total hip", "joint replacement"],
  
  // Body parts
  "knee": ["ghutna", "ghutne", "mokalu", "joint"],
  "shoulder": ["kandha", "kandhe", "rotator"],
  "back": ["kamar", "spine", "lower back", "backache", "lumbar"],
  "hip": ["kulha", "pelvis", "groin"],
  "wrist": ["kalai", "hand", "carpal"],
  "ankle": ["takhna", "foot"],
  "neck": ["cervical", "gardan"],
  
  // Conditions
  "fracture": ["broken", "crack", "toota", "tuta", "break"],
  "sprain": ["moch", "twist", "strain", "ligament"],
  "tear": ["rupture", "torn", "phata", "injury"],
  "surgery": ["operation", "procedure", "surgical"],
  "pain": ["dard", "ache", "hurt", "noppi"]
};

// Auto-suggest entries
export const AUTO_SUGGEST_ENTRIES = [
  // Common conditions
  { text: "ACL tear treatment", category: "Condition" },
  { text: "Meniscus tear symptoms", category: "Condition" },
  { text: "Rotator cuff injury", category: "Condition" },
  { text: "Herniated disc treatment", category: "Condition" },
  { text: "Sciatica pain relief", category: "Condition" },
  { text: "Frozen shoulder exercises", category: "Condition" },
  { text: "Carpal tunnel syndrome", category: "Condition" },
  { text: "Trigger finger treatment", category: "Condition" },
  { text: "Hip arthritis symptoms", category: "Condition" },
  { text: "Spinal stenosis", category: "Condition" },
  { text: "Knee osteoarthritis", category: "Condition" },
  { text: "Clubfoot in babies", category: "Condition" },
  { text: "Scoliosis treatment", category: "Condition" },
  
  // Treatments
  { text: "Knee replacement surgery", category: "Treatment" },
  { text: "Hip replacement recovery", category: "Treatment" },
  { text: "ACL reconstruction", category: "Treatment" },
  { text: "Arthroscopic surgery", category: "Treatment" },
  { text: "Physical therapy for back pain", category: "Treatment" },
  
  // Searches by location
  { text: "Knee specialist near me", category: "Search" },
  { text: "Spine surgeon in Hyderabad", category: "Search" },
  { text: "Shoulder doctor in Mumbai", category: "Search" },
  { text: "Sports medicine specialist", category: "Search" },
  { text: "Pediatric orthopedic doctor", category: "Search" },
  { text: "Best orthopedic surgeon Delhi", category: "Search" },
  { text: "Joint replacement surgeon Bangalore", category: "Search" },
  
  // Symptom-based
  { text: "Knee pain when climbing stairs", category: "Symptom" },
  { text: "Shoulder pain at night", category: "Symptom" },
  { text: "Back pain after sitting", category: "Symptom" },
  { text: "Hip pain while walking", category: "Symptom" },
  { text: "Numbness in hands", category: "Symptom" },
  { text: "Knee swelling treatment", category: "Symptom" },
  { text: "Neck pain and stiffness", category: "Symptom" },
  
  // Hindi searches
  { text: "घुटने का दर्द (Knee pain)", category: "Hindi" },
  { text: "कमर दर्द का इलाज (Back pain treatment)", category: "Hindi" },
  { text: "कंधे की चोट (Shoulder injury)", category: "Hindi" },
  { text: "हड्डी टूटना (Bone fracture)", category: "Hindi" },
];

export function getTopicContent(slug) {
  return TOPIC_CONTENT[slug] || null;
}

export function searchSynonyms(query) {
  const lowerQuery = query.toLowerCase();
  let expandedTerms = [lowerQuery];
  
  Object.entries(SEARCH_SYNONYMS).forEach(([key, synonyms]) => {
    if (lowerQuery.includes(key)) {
      expandedTerms = [...expandedTerms, ...synonyms];
    }
    synonyms.forEach(syn => {
      if (typeof syn === 'string' && lowerQuery.includes(syn.toLowerCase())) {
        expandedTerms.push(key);
        expandedTerms = [...expandedTerms, ...synonyms];
      }
    });
  });
  
  return [...new Set(expandedTerms)];
}

export function getAutoSuggestions(query, limit = 8) {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  const matches = AUTO_SUGGEST_ENTRIES.filter(entry =>
    entry.text.toLowerCase().includes(lowerQuery)
  );
  
  return matches.slice(0, limit);
}
