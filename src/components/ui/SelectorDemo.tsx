import React, { useState } from 'react';
import GroupColorSelector from './GroupColorSelector';
import InstrumentSelector from './InstrumentSelector';

const SelectorDemo: React.FC = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);

  return (
    <div className="p-6 bg-terminal-bg text-terminal-text">
      <h2 className="text-xl font-bold mb-6">New Selector Components Demo</h2>
      
      <div className="space-y-6">
        {/* Separate components demo */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Separated Components</h3>
          <div className="flex items-center space-x-4 p-4 bg-terminal-widget rounded-lg">
            <div>
              <label className="block text-sm text-terminal-muted mb-2">Group Color:</label>
              <GroupColorSelector
                selectedGroupId={selectedGroupId}
                onGroupSelect={setSelectedGroupId}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-terminal-muted mb-2">Trading Instrument:</label>
              <InstrumentSelector
                selectedGroupId={selectedGroupId}
                className="w-full"
                placeholder="Search account | exchange | market | pair..."
              />
            </div>
          </div>
        </div>

        {/* Widget header simulation */}
        <div>
          <h3 className="text-lg font-semibold mb-3">In Widget Header (как в WidgetSimple)</h3>
          <div className="bg-terminal-accent/60 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <GroupColorSelector
                selectedGroupId={selectedGroupId}
                onGroupSelect={setSelectedGroupId}
                className="flex-shrink-0"
              />
              <InstrumentSelector
                selectedGroupId={selectedGroupId}
                className="w-64"
                placeholder="Search instrument..."
              />
              <div className="flex-1 text-xs font-medium text-terminal-text">
                Widget Title
              </div>
              <div className="text-xs text-terminal-muted">
                Settings • Minimize • Close
              </div>
            </div>
          </div>
        </div>

        {/* State display */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Current State</h3>
          <div className="p-4 bg-terminal-widget rounded-lg">
            <div className="text-sm">
              <div>Selected Group ID: {selectedGroupId || 'None'}</div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Benefits of Separation</h3>
          <div className="p-4 bg-terminal-widget rounded-lg text-sm space-y-2">
            <div>✅ <strong>Clear UX:</strong> Color selection and instrument search are separate concerns</div>
            <div>✅ <strong>Better Layout:</strong> More flexible positioning and sizing</div>
            <div>✅ <strong>Simpler Logic:</strong> Each component handles one responsibility</div>
            <div>✅ <strong>Reusable:</strong> Components can be used independently</div>
            <div>✅ <strong>Inspired by Design:</strong> Matches the clean separation shown in reference app</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectorDemo; 