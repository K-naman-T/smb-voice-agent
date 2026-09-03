"""Golden test suite for sentence aggregation (§2.5).

Asserts proper splitting and protection across >= 30 test cases including
abbreviations, currency, decimals, and question/exclamation boundaries.
"""
import pytest
from runtime_contracts.sentence_aggregator import SentenceAggregator


@pytest.fixture
def aggregator():
    return SentenceAggregator(max_chars=100)


GOLDEN_CASES = [
    # 1-5: Common abbreviations
    ("Hello Dr. Smith is here.", ["Hello Dr. Smith is here."]),
    ("Please visit Mr. Henderson today.", ["Please visit Mr. Henderson today."]),
    ("We spoke with Mrs. Gable earlier.", ["We spoke with Mrs. Gable earlier."]),
    ("Contact Ms. Davis at your convenience.", ["Contact Ms. Davis at your convenience."]),
    ("The clinic is on Elm St. near the bank.", ["The clinic is on Elm St. near the bank."]),

    # 6-10: Decimals and currency
    ("Your diagnostic fee will be $12.50 total.", ["Your diagnostic fee will be $12.50 total."]),
    ("The unit needs a 3.5 ton compressor.", ["The unit needs a 3.5 ton compressor."]),
    ("That will be ₹1500.50 for standard service.", ["That will be ₹1500.50 for standard service."]),
    ("Pressure dropped by 0.75 bar.", ["Pressure dropped by 0.75 bar."]),
    ("The AC runs on 2.4 ghz WiFi.", ["The AC runs on 2.4 ghz WiFi."]),

    # 11-15: Multi-sentence splitting
    ("Hello there! How can I help you today?", ["Hello there!", "How can I help you today?"]),
    ("Your AC is not cooling. We can fix that. Are you free tomorrow?",
     ["Your AC is not cooling.", "We can fix that.", "Are you free tomorrow?"]),
    ("I have booked your slot. You will receive an SMS shortly.",
     ["I have booked your slot.", "You will receive an SMS shortly."]),
    ("Emergency line is busy! Please hold on.", ["Emergency line is busy!", "Please hold on."]),
    ("Is this John? Good morning.", ["Is this John?", "Good morning."]),

    # 16-20: Abbreviations followed by sentence boundary
    ("We have parts, filters, etc. Would you like a tune-up?",
     ["We have parts, filters, etc.", "Would you like a tune-up?"]),
    ("Please call Dept. 4 immediately.", ["Please call Dept. 4 immediately."]),
    ("Our technician is approx. 10 minutes away.", ["Our technician is approx. 10 minutes away."]),
    ("Order No. 402 is ready for pickup.", ["Order No. 402 is ready for pickup."]),
    ("It is Team A vs. Team B today.", ["It is Team A vs. Team B today."]),

    # 21-25: Streaming token simulation
    ("I will schedule your appointment now.", ["I will schedule your appointment now."]),
    ("What is your address? We can send someone over.", ["What is your address?", "We can send someone over."]),
    ("Thank you for calling! Have a wonderful day!", ["Thank you for calling!", "Have a wonderful day!"]),
    ("The refrigerant level is at 4.2 psi. That looks normal.", ["The refrigerant level is at 4.2 psi.", "That looks normal."]),
    ("Visit CoolAir Inc. for more details.", ["Visit CoolAir Inc. for more details."]),

    # 26-32: Edge cases and compound expressions
    ("Dr. Watson will arrive at 3 p.m. tomorrow.", ["Dr. Watson will arrive at 3 p.m. tomorrow."]),
    ("Call us back at 8 a.m. sharp.", ["Call us back at 8 a.m. sharp."]),
    ("The filter costs $45.99 each. Installation is included.", ["The filter costs $45.99 each.", "Installation is included."]),
    ("We service split AC systems. Inverter models are also covered.", ["We service split AC systems.", "Inverter models are also covered."]),
    ("Are you sure? Yes! Let's proceed.", ["Are you sure?", "Yes!", "Let's proceed."]),
    ("Please confirm your phone number. Is it 555-0199?", ["Please confirm your phone number.", "Is it 555-0199?"]),
    ("Your invoice is ready. Total is $125.00.", ["Your invoice is ready.", "Total is $125.00."])
]


def test_golden_cases_count():
    assert len(GOLDEN_CASES) >= 30, f"Expected >= 30 golden test cases, got {len(GOLDEN_CASES)}"


@pytest.mark.parametrize("input_text,expected_sentences", GOLDEN_CASES)
def test_sentence_aggregator_golden_cases(aggregator, input_text, expected_sentences):
    # Simulate streaming by pushing words
    results = []
    for word in input_text.split(" "):
        res = aggregator.push(word + " ")
        results.extend(res)
    results.extend(aggregator.flush())

    assert results == expected_sentences, f"Failed on input: {input_text!r}\nGot: {results}\nExpected: {expected_sentences}"
