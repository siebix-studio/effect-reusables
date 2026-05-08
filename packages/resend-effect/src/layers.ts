import { Layer } from "effect";
import { ResendContacts } from "./contacts.service";
import { ResendEmails } from "./emails.service";
import {
  ResendClient,
  type ResendClientLayerConfigOptions,
  type ResendClientOptions,
} from "./resend-client.service";

const resourceLayer = Layer.mergeAll(ResendEmails.layer, ResendContacts.layer);

/** Provides `ResendEmails` and `ResendContacts` from direct client options. */
export const ResendLayer = (options: ResendClientOptions) =>
  resourceLayer.pipe(Layer.provide(ResendClient.layer(options)));

/** Provides `ResendEmails` and `ResendContacts` from Effect Config. */
export const ResendLayerConfig = (options?: ResendClientLayerConfigOptions) =>
  resourceLayer.pipe(Layer.provide(ResendClient.layerConfig(options)));
