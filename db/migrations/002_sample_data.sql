-- Sample Data: Testing and Development
-- Project: German Insurance AI Backend
-- Date: December 7, 2025
-- Description: Inserts sample data for testing the RAG system
-- Run this AFTER executing the initial migration

-- =============================================================================
-- STEP 1: Insert Sample Insurers
-- =============================================================================

INSERT INTO insurers (id, name, description, website, insurance_types, contact_email, contact_phone)
VALUES 
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Allianz Deutschland',
    'One of the largest insurance providers in Germany, offering comprehensive coverage across health, life, auto, home, and travel insurance.',
    'https://www.allianz.de',
    ARRAY['health', 'life', 'auto', 'home', 'travel'],
    'service@allianz.de',
    '+49 89 3800 0'
  ),
  (
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'AOK Bayern',
    'Regional statutory health insurance provider serving Bavaria with a focus on preventive care and comprehensive health services.',
    'https://www.aok.de/bayern',
    ARRAY['health'],
    'kontakt@bayern.aok.de',
    '+49 89 2730 0'
  ),
  (
    'c2ggde99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'ERGO Versicherung',
    'Leading German insurance group providing life, health, and property insurance with digital-first approach.',
    'https://www.ergo.de',
    ARRAY['health', 'life', 'home', 'legal'],
    'info@ergo.de',
    '+49 211 477 0'
  );

-- =============================================================================
-- STEP 2: Insert Sample Documents
-- =============================================================================

INSERT INTO documents (id, insurer_id, title, insurance_type, document_type, source_url, language, metadata)
VALUES 
  (
    'd3hhef99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Allianz Krankenversicherung - Allgemeine Versicherungsbedingungen 2024',
    'health',
    'terms',
    'https://www.allianz.de/gesundheit/krankenversicherung/avb.pdf',
    'de',
    '{"year": 2024, "pages": 45, "version": "1.0"}'::jsonb
  ),
  (
    'e4iijg99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Allianz Lebensversicherung - Produktinformationsblatt',
    'life',
    'brochure',
    'https://www.allianz.de/leben/lebensversicherung/pib.pdf',
    'de',
    '{"year": 2024, "pages": 12, "version": "2.1"}'::jsonb
  ),
  (
    'f5jjkh99-9c0b-4ef8-bb6d-6bb9bd380a66',
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'AOK Bayern - Leistungskatalog Krankenversicherung',
    'health',
    'policy',
    'https://www.aok.de/bayern/leistungen/katalog.pdf',
    'de',
    '{"year": 2024, "pages": 78, "category": "benefits"}'::jsonb
  ),
  (
    'g6kkli99-9c0b-4ef8-bb6d-6bb9bd380a77',
    'c2ggde99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'ERGO Hausratversicherung - Häufig gestellte Fragen',
    'home',
    'faq',
    'https://www.ergo.de/hausrat/faq',
    'de',
    '{"year": 2024, "questions": 25}'::jsonb
  );

-- =============================================================================
-- STEP 3: Insert Sample Document Chunks (without embeddings initially)
-- =============================================================================

-- Allianz Health Insurance - Chunk 1
INSERT INTO document_chunks (id, document_id, insurer_id, chunk_text, chunk_index, token_count, metadata)
VALUES (
  'h7llmj99-9c0b-4ef8-bb6d-6bb9bd380a88',
  'd3hhef99-9c0b-4ef8-bb6d-6bb9bd380a44',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Die private Krankenversicherung der Allianz bietet umfassenden Schutz für ambulante und stationäre Behandlungen. Versicherte haben freie Arztwahl und profitieren von schnelleren Terminen bei Fachärzten. Die Versicherung übernimmt die Kosten für Vorsorgeuntersuchungen, Zahnbehandlungen und alternative Heilmethoden wie Homöopathie und Akupunktur.',
  0,
  89,
  '{"page": 1, "section": "Leistungsumfang"}'::jsonb
);

-- Allianz Health Insurance - Chunk 2
INSERT INTO document_chunks (id, document_id, insurer_id, chunk_text, chunk_index, token_count, metadata)
VALUES (
  'i8mmnk99-9c0b-4ef8-bb6d-6bb9bd380a99',
  'd3hhef99-9c0b-4ef8-bb6d-6bb9bd380a44',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Für Krankenhausaufenthalte gilt: Versicherte können zwischen Unterkunft im Ein- oder Zweibettzimmer wählen. Die Chefarztbehandlung ist standardmäßig eingeschlossen. Bei Operationen erfolgt eine Kostenübernahme von 100% der Gebührenordnung für Ärzte (GOÄ). Auch Begleitpersonen bei Kindern unter 14 Jahren werden mitversichert.',
  1,
  67,
  '{"page": 2, "section": "Krankenhausleistungen"}'::jsonb
);

-- Allianz Life Insurance - Chunk 1
INSERT INTO document_chunks (id, document_id, insurer_id, chunk_text, chunk_index, token_count, metadata)
VALUES (
  'j9nnol99-9c0b-4ef8-bb6d-6bb9bd380b00',
  'e4iijg99-9c0b-4ef8-bb6d-6bb9bd380a55',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Die Allianz Lebensversicherung kombiniert Absicherung und Altersvorsorge. Im Todesfall erhalten die Hinterbliebenen eine garantierte Versicherungssumme. Zusätzlich können Sie durch Überschussbeteiligungen von der wirtschaftlichen Entwicklung profitieren. Die Police kann auch als Sicherheit für Immobiliendarlehen verwendet werden.',
  0,
  59,
  '{"page": 1, "section": "Produktbeschreibung"}'::jsonb
);

-- AOK Bayern - Chunk 1
INSERT INTO document_chunks (id, document_id, insurer_id, chunk_text, chunk_index, token_count, metadata)
VALUES (
  'k0oopm99-9c0b-4ef8-bb6d-6bb9bd380b11',
  'f5jjkh99-9c0b-4ef8-bb6d-6bb9bd380a66',
  'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'Die AOK Bayern ist eine gesetzliche Krankenversicherung mit umfassendem Leistungskatalog. Versicherte erhalten kostenlose Vorsorgeuntersuchungen, Schutzimpfungen und Zahnprophylaxe. Die AOK übernimmt auch Kosten für Schwangerschaftsvorsorge, Geburten und Nachsorge. Besondere Programme wie Hausarztmodell und integrierte Versorgung sind verfügbar.',
  0,
  72,
  '{"page": 5, "section": "Grundleistungen"}'::jsonb
);

-- AOK Bayern - Chunk 2
INSERT INTO document_chunks (id, document_id, insurer_id, chunk_text, chunk_index, token_count, metadata)
VALUES (
  'l1ppqn99-9c0b-4ef8-bb6d-6bb9bd380b22',
  'f5jjkh99-9c0b-4ef8-bb6d-6bb9bd380a66',
  'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'Zusatzleistungen der AOK Bayern umfassen professionelle Zahnreinigung, Osteopathie und Naturheilverfahren. Für Familien gibt es spezielle Bonusprogramme: Wer regelmäßig Vorsorgeuntersuchungen wahrnimmt und gesundheitsbewusst lebt, kann Bonuspunkte sammeln und gegen Prämien oder Beitragsnachlässe einlösen.',
  1,
  55,
  '{"page": 12, "section": "Zusatzleistungen"}'::jsonb
);

-- ERGO Home Insurance - Chunk 1
INSERT INTO document_chunks (id, document_id, insurer_id, chunk_text, chunk_index, token_count, metadata)
VALUES (
  'm2qqro99-9c0b-4ef8-bb6d-6bb9bd380b33',
  'g6kkli99-9c0b-4ef8-bb6d-6bb9bd380a77',
  'c2ggde99-9c0b-4ef8-bb6d-6bb9bd380a33',
  'Was ist in der ERGO Hausratversicherung versichert? Die Hausratversicherung schützt Ihr gesamtes bewegliches Eigentum in Ihrer Wohnung gegen Schäden durch Feuer, Leitungswasser, Sturm, Hagel, Einbruchdiebstahl und Raub. Auch Überspannungsschäden durch Blitzschlag sind mitversichert. Die Deckungssumme sollte dem Neuwert Ihres Hausrats entsprechen.',
  0,
  68,
  '{"page": 1, "section": "FAQ", "question": 1}'::jsonb
);

-- ERGO Home Insurance - Chunk 2
INSERT INTO document_chunks (id, document_id, insurer_id, chunk_text, chunk_index, token_count, metadata)
VALUES (
  'n3rrsp99-9c0b-4ef8-bb6d-6bb9bd380b44',
  'g6kkli99-9c0b-4ef8-bb6d-6bb9bd380a77',
  'c2ggde99-9c0b-4ef8-bb6d-6bb9bd380a33',
  'Wie berechne ich die richtige Versicherungssumme? Als Faustregel gilt: 650 Euro pro Quadratmeter Wohnfläche. Eine 80 Quadratmeter Wohnung würde also eine Versicherungssumme von 52.000 Euro benötigen. Wertvolle Einzelstücke wie Schmuck oder Kunst sollten separat angegeben werden. Die ERGO bietet auch einen Online-Rechner zur präzisen Ermittlung an.',
  1,
  71,
  '{"page": 2, "section": "FAQ", "question": 5}'::jsonb
);

-- =============================================================================
-- STEP 4: Verification Queries
-- =============================================================================

-- Count inserted records
SELECT 
  (SELECT COUNT(*) FROM insurers) AS insurers_count,
  (SELECT COUNT(*) FROM documents) AS documents_count,
  (SELECT COUNT(*) FROM document_chunks) AS chunks_count;

-- View sample data
SELECT 
  i.name AS insurer,
  d.title AS document,
  COUNT(dc.id) AS chunk_count
FROM insurers i
LEFT JOIN documents d ON d.insurer_id = i.id
LEFT JOIN document_chunks dc ON dc.document_id = d.id
GROUP BY i.name, d.title
ORDER BY i.name, d.title;

-- =============================================================================
-- STEP 5: Test Queries (without embeddings)
-- =============================================================================

-- Find all chunks for Allianz
SELECT 
  dc.chunk_text,
  dc.chunk_index,
  d.title
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
JOIN insurers i ON dc.insurer_id = i.id
WHERE i.name LIKE '%Allianz%'
ORDER BY d.title, dc.chunk_index;

-- Find all health insurance documents
SELECT 
  i.name AS insurer,
  d.title,
  d.document_type,
  COUNT(dc.id) AS chunks
FROM documents d
JOIN insurers i ON d.insurer_id = i.id
LEFT JOIN document_chunks dc ON dc.document_id = d.id
WHERE d.insurance_type = 'health'
GROUP BY i.name, d.title, d.document_type
ORDER BY i.name;

-- =============================================================================
-- NOTE: To add embeddings, you'll need to:
-- 1. Generate embeddings using Vertex AI textembedding-gecko
-- 2. Update each chunk with its embedding vector
-- Example:
-- UPDATE document_chunks 
-- SET embedding = '[0.123, -0.456, ...]'::vector 
-- WHERE id = 'chunk-uuid';
-- =============================================================================

DO $$ BEGIN
  RAISE NOTICE 'Sample data inserted successfully!';
  RAISE NOTICE 'Next: Generate and add embeddings for vector search.';
END $$;
