import { useState } from 'react'
import { ConfigFormSections } from '../widgets/ConfigFormSections'

export function BottomConsole() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="bottom-console" role="region" aria-label="控制台">
      <div className="console-bar" role="tablist" aria-label="控制台标签">
        <div className="console-bar-left">
          <h3 className="console-title">控制栏</h3>
          <button type="button" className="active" role="tab" aria-selected="true">
            配置项
          </button>
        </div>
        <button 
          type="button" 
          className="collapse-button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "展开" : "折叠"}
        >
          {isCollapsed ? "▼" : "▲"}
        </button>
      </div>
      {!isCollapsed && (
        <div className="console-body" role="tabpanel">
          <ConfigFormSections />
        </div>
      )}
    </div>
  )
}
