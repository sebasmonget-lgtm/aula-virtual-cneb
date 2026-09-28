"use client";

import { DictationRecorder } from "./dictation-recorder";

/** Interview audio stays literal; only its parent can autosave a draft answer. */
export function InterviewAudioRecorder({ studentId, question, currentText, onTranscribed, onBusyChange }: {
  studentId: string; question: string; currentText: string;
  onTranscribed: (text: string, saveNow: boolean) => Promise<void> | void;
  onBusyChange?: (busy: boolean) => void;
}) {
  return <DictationRecorder studentId={studentId} context={question} currentText={currentText}
    purpose="interview" onTranscribed={onTranscribed} onBusyChange={onBusyChange} />;
}
