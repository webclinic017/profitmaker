import React from 'react';
import DealsWidget from './DealsWidget';

/**
 * Example usage of the DealsWidget component
 * This file demonstrates how to integrate the DealsWidget into your application
 */
const DealsWidgetExample: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Deals Widget Example</h1>
        <p className="text-muted-foreground">
          This widget allows you to manage trading deals. You can view all deals in a list,
          open individual deals to see details, edit deal information, and manage trades within each deal.
        </p>
      </div>

      {/* Basic Usage */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Basic Usage</h2>
        <DealsWidget 
          dashboardId="example-dashboard"
          widgetId="deals-widget-example"
        />
      </div>

      {/* With Initial Deal Selection */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Start with Specific Deal</h2>
        <DealsWidget 
          dashboardId="example-dashboard-2"
          widgetId="deals-widget-example-2"
          initialMode="details"
          initialDealId="1"
        />
      </div>

      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-2">Features:</h3>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>View all deals in a comprehensive table format</li>
          <li>Click on any deal to view detailed information</li>
          <li>Add new deals with the "Add Deal" button</li>
          <li>Edit deal names and notes directly in the detail view</li>
          <li>Add trades to deals using the "Add Trades" button</li>
          <li>Remove trades from deals individually</li>
          <li>Automatic calculation of deal statistics (profit/loss, trade counts)</li>
          <li>Navigate back to the deals list using the back arrow</li>
          <li>Responsive design that works on all screen sizes</li>
        </ul>
      </div>
    </div>
  );
};

export default DealsWidgetExample; 