from backend.nlp.ner import extract_entities

text = """
Reliance Industries announced a major investment in Jio Platforms.
Google and Meta are also investors in the company.
"""


entities = extract_entities(text)

print("\nDetected entities:\n")

for entity in entities:
    print(entity)
