const hasChildRoutes = (module) => (module !== null && typeof module === 'object') && !!module.childRoutes;

export default hasChildRoutes;
