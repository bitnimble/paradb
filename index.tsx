import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createApp } from './create';
import './defaults.css';

const App = createApp();

ReactDOM.render(<App />, document.getElementById('app'));
