import { configure } from 'mobx';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createApp } from './create';
import './defaults.css';

const App = createApp();
configure({ reactionRequiresObservable: true, enforceActions: 'observed' });

ReactDOM.render(<App/>, document.getElementById('app'));
