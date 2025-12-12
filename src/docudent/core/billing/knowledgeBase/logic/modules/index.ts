/**
 * Billing Modules Index
 * 
 * Importiert und registriert alle Behandlungsmodule.
 */

// Import registriert automatisch die Module
import './fuellung';
import './endo';
import './extraktion';

// Re-export für einfachen Zugriff
export { FuellungBillingModule } from './fuellung';
export { EndoBillingModule } from './endo';
export { ChirurgieBillingModule } from './extraktion';
