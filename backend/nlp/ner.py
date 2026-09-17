import spacy


# Load the English NLP model once.
nlp_model = spacy.load("en_core_web_sm")


def extract_entities(text: str):

    doc = nlp_model(text)

    entities = []

    for entity in doc.ents:

        entities.append({
            "text": entity.text,
            "label": entity.label_
        })

    return entities