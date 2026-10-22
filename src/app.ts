import '@shared/otel';
import buildApplication from "./composition/build-application";


const application = buildApplication();


application.start();
