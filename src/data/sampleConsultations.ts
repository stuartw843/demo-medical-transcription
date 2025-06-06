export interface SampleConsultation {
  id: string;
  name: string;
  transcript: Array<{
    speaker: string;
    text: string;
  }>;
}

export const sampleConsultations: SampleConsultation[] = [
  {
    id: "routine-checkup",
    name: "Routine Checkup - Hypertension",
    transcript: [
      { speaker: "Doctor", text: "Good morning, Mr. Johnson. How are you feeling today?" },
      { speaker: "Patient", text: "Morning, Doctor. I've been doing okay, but still concerned about my blood pressure." },
      { speaker: "Doctor", text: "I see. Have you been monitoring your blood pressure at home as we discussed?" },
      { speaker: "Patient", text: "Yes, I've been checking it twice daily. The readings are usually around 145/90." },
      { speaker: "Doctor", text: "And how's your compliance with the medications I prescribed last time?" },
      { speaker: "Patient", text: "I take them regularly, but sometimes I forget the evening dose." },
      { speaker: "Doctor", text: "I understand. Have you experienced any side effects from the medication?" },
      { speaker: "Patient", text: "Sometimes I feel a bit dizzy in the mornings, especially when I stand up quickly." },
      { speaker: "Doctor", text: "Let me check your blood pressure now... It's 142/88. Have you made any changes to your diet?" },
      { speaker: "Patient", text: "Yes, I've reduced my salt intake and started eating more vegetables. I've also lost about 5 pounds." },
      { speaker: "Doctor", text: "That's excellent progress. How's your exercise routine going?" },
      { speaker: "Patient", text: "I walk for 30 minutes most days, but sometimes work gets in the way." },
      { speaker: "Doctor", text: "Let's listen to your heart and lungs... Everything sounds normal. Any other concerns?" },
      { speaker: "Patient", text: "I've been having occasional headaches, usually in the evening." },
      { speaker: "Doctor", text: "How would you describe these headaches? And how often do they occur?" },
      { speaker: "Patient", text: "They're dull, maybe twice a week, especially after stressful days at work." },
      { speaker: "Doctor", text: "I'd like to adjust your medication slightly and add a reminder system for your evening dose." },
      { speaker: "Patient", text: "That would be helpful. What changes are you suggesting?" },
      { speaker: "Doctor", text: "I'm going to keep your morning dose the same but switch your evening medication to a longer-acting version." },
      { speaker: "Patient", text: "Will this help with the headaches too?" },
      { speaker: "Doctor", text: "Yes, it should help. I'd like to see you again in one month to check your progress." },
      { speaker: "Patient", text: "That sounds good. Should I continue with the home monitoring?" },
      { speaker: "Doctor", text: "Yes, please continue twice daily readings. Any other questions for me?" },
      { speaker: "Patient", text: "No, I think that covers everything. Thank you, Doctor." },
      /**{ speaker: "Doctor", text: "You're welcome. Remember: consistent medication, low salt diet, and regular exercise. See you in a month." }
    **/]
  }
];
