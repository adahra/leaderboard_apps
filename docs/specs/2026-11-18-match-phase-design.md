# Match Phase Features Design

## Intent and Purpose
Implement three interconnected features to enhance tournament management and user experience:
- **Scheduling System**: Intelligent match generation based on bracket types and team counts
- **Live Bracket Visualization**: Real-time bracket tree display with match status updates
- **Simple Player Statistics Dashboard**: Individual player performance tracking and analytics

## Goals, Non-goals, Anti-goals

### Goals
1. Automate match scheduling for both double_elimination and knockout brackets
2. Provide real-time visual feedback of tournament progress
3. Enable performance tracking for individual competitors
4. Maintain existing data models and API contracts
5. Support mobile-responsive UI components

### Non-goals
- Advanced predictive analytics or machine learning
- Third-party integrations (external APIs, services)
- Complex user role management changes
- Database schema modifications

### Anti-goals  
- Feature bloat that delays core functionality
- Performance degradation for existing operations
- Over-engineering bracket logic
- Breaking existing frontend components

## Current State Analysis

### Existing Components
- `backend/config/db.js`: Category schema with 'double_elimination' and 'knockout' schemas
- `frontend/js/app.js`: CATEGORIES object with junior/senior definitions
- `backend/controllers/teamsController.js`: Team management and group assignment logic
- `backend/controllers/categoriesController.js`: Category validation and management

### What Needs to Change
1. **Scheduling Logic**: Generate matches based on bracket type and team count
2. **Data Integration**: Connect scheduling output to frontend visualization
3. **UI Components**: Add bracket tree display and statistics dashboard

## Technical Constraints

### Backend Requirements
- Maintain existing Express.js API patterns
- Follow current error handling conventions
- Preserve authentication and authorization checks
- Use existing database transaction patterns

### Frontend Requirements
- Reuse existing API wrapper (`frontend/js/api.js`)
- Follow current vanilla JS patterns (no frameworks)
- Maintain dark mode and responsive design
- Use existing Bootstrap 5 components

### Performance Constraints
- Scheduling should complete within seconds for up to 64 teams
- Real-time updates should not impact existing API response times
- Memory usage proportional to tournament size

## Approaches Considered

### Approach 1: Phased Implementation
1. **Phase 1**: Scheduling system + basic visualization
2. **Phase 2**: Advanced bracket features
3. **Phase 3**: Analytics and statistics

### Approach  2: Parallel Development
1. **Parallel**: Scheduling + visualization + statistics
2. **Dependencies**: Each feature provides data for others

### Approach 3: Feature-rich Single Release
1. **Complete**: All three features in one release
2. **Dependencies**: Each feature depends on others

**Selected Approach**: Parallel Development with Feature Dependencies
**Rationale**: Maximizes development speed while ensuring feature interoperability

## Feature Specifications

### 1. Scheduling System
**Purpose**: Generate complete match schedules for any bracket type

**Input Parameters**
- category: 'junior' or 'senior'
- schema: 'double_elimination' or 'knockout'  
- team_count: Number of participating teams

**Output Format**
```json
{
  "matches": [
    {
      "id": "m1",
      "round": "r1",
      "team_a": "T1",
      "team_b": "T2", 
      "scheduled_at": "2024-01-15T10:00:xffffff",
      "status": "scheduled",
      "court": "Court A"
    }
  ],
  "metadata": {
    "total_rounds": 5,
    "bye_handling": "automatic",
    "generated_at": "2024-01-15T00:00:00"
  }
}
```

**Key Features**
- Automatic bye calculation for non-power-of-two team counts
- Support for team seeding and court assignments
- Timestamp generation based on bracket rules
- Validation of bracket structure before scheduling

**Implementation Details**
- Algorithm: Bracket tree generation with match tracking
- Storage: Matches stored in `matches` table or attached to `results` table
- API Endpoint: `POST /api/schedules/generate`

### 2. Live Bracket Visualization
**Purpose**: Real-time visual representation of tournament bracket with match status

**User Experience**
- Interactive bracket tree with expandable/collapsible rounds
- Color-coded match status (scheduled, completed, in-progress)
- Drill-down capability for match details
- Mobile-responsive tree layout

**Data Flow**
1. Frontend requests bracket data from scheduling API
2. Real-time updates via WebSocket or polling
3. Local rendering using D3.js or vanilla canvas

**Components**
- BracketTree component: Main visualization container
- MatchNode component: Individual match display
- RoundHeader component: Round-level organization
- StatusIndicator component: Visual status feedback

**Visual Design**
- Tree structure mimicking traditional bracket layout
- Responsive sizing for desktop/mobile
- Accessibility with ARIA labels and keyboard navigation
- Dark mode support consistent with existing design

### 3. Simple Player Statistics Dashboard
**Purpose**: Individual player performance tracking and analytics

**Metrics**
- Win/loss records per player
- Match-by-match performance history
- Head-to-head results against specific opponents
- Tournament progression statistics

**UI Layout**
- Player list with sortable columns (name, wins, losses, win-rate)
- Individual player detail view with match history
- Filter options by category and time period
- Simple charts for win-rate visualization

**Data Integration**
- Pull results from existing API endpoints
- Aggregate player performance across matches
- Calculate statistics using existing result data
- Display real-time updates when new results are entered

## Technical Implementation Plan

### Phase 1: Core Scheduling Logic
1. **Algorithm Development**: Bracket generation for both schema types
2. **Database Integration**: Match storage and retrieval
3. **API Implementation**: Schedule generation endpoint
4. **Testing**: Unit tests for bracket calculations

### Phase 2: Visualization Components
1. **Component Library**: Reusable bracket visualization components
2. **Data Binding**: Connect components to scheduling API
3. **Interactive Features**: Expand/collapse, filtering, search
4. **Responsive Design**: Mobile and desktop layouts

### Phase 3: Statistics and Analytics
1. **Data Aggregation**: Player performance calculations
2. **UI Integration**: Dashboard components and filters
3. **Visualization Elements**: Charts and progress indicators
4. **User Interface**: Dashboard layout and navigation

## Risk Assessment

### High Risk
- **Bracket Algorithm Complexity**: Correctly handling all edge cases (byes, reseeding)
- **Real-time Updates**: Ensuring low-latency for live bracket updates
- **Mobile Performance**: Tree visualization on limited screen space

### Medium Risk
- **Feature Integration**: Ensuring all three features work together
- **Data Consistency**: Maintaining sync between scheduling, visualization, and stats
- **Performance Impact**: Impact on existing API response times

### Low Risk
- **Component Reusability**: Leveraging existing UI patterns
- **API Compatibility**: Following existing Express.js conventions
- **Testing Coverage**: Available test infrastructure

## Success Criteria

### Functional Requirements
- [ ] Generate complete match schedule for any tournament size
- [ ] Display bracket tree with correct match progression
- [ ] Show player statistics with accurate calculations
- [ ] Update all components in real-time when results change

### User Experience Requirements
- [ ] Visual hierarchy clearly shows tournament progression
- [ ] Mobile layout works on phones and tablets
- [ ] Loading times under 2 seconds for initial data load
- [ ] No breaking changes to existing functionality

### Technical Requirements
- [ ] 100% code coverage for new features
- [ ] Error handling matches existing patterns
- [ ] Memory usage scales appropriately with tournament size
- [ ] API endpoints follow existing conventions

## Rollout Plan

### Week 1
- Complete Scheduling System (Algorithm + API)
- Begin Live Bracket Visualization component development
- Set up statistics data aggregation

### Week 2
- Complete Live Bracket Visualization implementation
- Begin Player Statistics Dashboard
- Integration testing between components

### Week 3
- Complete Player Statistics Dashboard
- End-to-end testing and bug fixes
- Performance optimization and mobile testing
- Final code review and documentation

## Open Questions for User

1. **Bracket Complexity**: Should we implement reseeding for later rounds (common in double elimination tournaments)?
2. **Mobile Priority**: Should we focus on mobile-first design for the bracket visualization given most users access from phones?
3. **Statistics Depth**: Should we include advanced metrics (head-to-head, strength of schedule) or stick to basic win/loss records?

**Next Steps**: Your responses to these questions will determine the scope and timeline for this implementation.