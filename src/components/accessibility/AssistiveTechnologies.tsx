import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AssistiveTechnologies: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistive Technology Support</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          MuniNow has been tested with and supports the following assistive technologies:
        </p>
        
        <h3 className="text-lg font-semibold">Screen Readers</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>NVDA (Windows):</strong> Full compatibility with latest versions</li>
          <li><strong>JAWS (Windows):</strong> Tested with versions 2021 and newer</li>
          <li><strong>VoiceOver (macOS/iOS):</strong> Native support across Apple devices</li>
          <li><strong>TalkBack (Android):</strong> Mobile accessibility support</li>
          <li><strong>ORCA (Linux):</strong> Open-source screen reader support</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Browser Compatibility</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Chrome/Chromium:</strong> Version 90 and newer with full accessibility API support</li>
          <li><strong>Firefox:</strong> Version 88 and newer with complete ARIA support</li>
          <li><strong>Safari:</strong> Version 14 and newer with VoiceOver integration</li>
          <li><strong>Edge:</strong> Version 90 and newer with Windows accessibility features</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Input Methods</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Keyboard Navigation:</strong> Full site functionality via keyboard alone</li>
          <li><strong>Voice Control:</strong> Compatible with Dragon NaturallySpeaking and Voice Control</li>
          <li><strong>Switch Navigation:</strong> Support for single and dual-switch devices</li>
          <li><strong>Eye Tracking:</strong> Compatible with eye-gaze control systems</li>
          <li><strong>Touch/Mobile:</strong> Accessible touch targets and gestures</li>
        </ul>
        
        <h3 className="text-lg font-semibold mt-4">Visual Accessibility</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>High Contrast Mode:</strong> Windows and macOS high contrast support</li>
          <li><strong>Dark Mode:</strong> System preference detection and support</li>
          <li><strong>Magnification:</strong> Screen magnifier compatibility (ZoomText, Windows Magnifier)</li>
          <li><strong>Color Blindness:</strong> Color-independent information design</li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default AssistiveTechnologies;