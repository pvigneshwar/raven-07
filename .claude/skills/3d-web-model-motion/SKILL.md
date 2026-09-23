---
name: 3d-web-model-motion
description: Methodology for accurate 3D model creation, integration, and motion design for websites — covering reference analysis, model structure, web delivery (glTF/GLB, Three.js/R3F), physically plausible animation, lighting, materials, performance, responsiveness, and accessibility. Activate when creating, recreating, optimizing, integrating, or animating 3D assets for web experiences.
---

# 3D Web Model & Motion — Methodology & Quality Criteria

This skill provides the **methodology and quality criteria** for creating, preparing, optimizing, integrating, and animating 3D models for modern websites.

## Purpose

The skill is responsible for helping create, prepare, optimize, integrate, and animate 3D models for modern websites. The priority order is:

1. **Visual accuracy**
2. **Correct proportions**
3. **Correct geometry**
4. **Correct materials**
5. **Correct lighting response**
6. **Correct animation/motion**
7. **Web performance**
8. **Responsive behavior**
9. **Maintainable implementation**

> Do not sacrifice model accuracy merely to make implementation easier.
> Do not sacrifice website performance unnecessarily either.

---

## 3D Model Accuracy

When creating or recreating a 3D model from reference images, screenshots, drawings, or specifications, analyze:

- **Overall silhouette**
- **Dimensions**
- **Proportions**
- **Primary geometry**
- **Secondary geometry**
- **Surface details**
- **Material boundaries**
- **Color**
- **Roughness**
- **Metallic properties**
- **Transparency**
- **Texture placement**
- **Branding/details**
- **Camera perspective**
- **Scale**
- **Symmetry / asymmetry**
- **Mechanical relationships**

Separate the model into logical components when appropriate. Do not invent important geometry when the reference provides enough information to determine it. When exact information is unavailable, make the smallest reasonable assumption and preserve consistency.

---

## Reference Analysis

Before modeling from references, determine:

- **What is directly observable?**
- **What can be inferred?**
- **What is unknown?**
- **What requires approximation?**
- **What must remain visually identical?**

Do not confuse camera distortion with actual object proportions. When multiple references are available, compare them before deciding geometry.

---

## Model Structure

Prefer a clean hierarchy:

```
MODEL
├── Main body
├── Secondary forms
├── Mechanical/components
├── Surface details
├── Materials
├── Decals/textures
└── Animation controls
```

- Use meaningful names.
- Avoid unnecessary geometry.
- Use separate meshes when a component needs independent: animation, material, visibility, interaction, or transformation.

---

## Web 3D

For website integration, consider technologies such as:

- **Three.js**
- **React Three Fiber** (R3F)
- **@react-three/drei**
- **GLTF / GLB**
- **WebGL / WebGPU** where appropriate

Prefer **GLB/glTF** for web delivery unless another format is specifically required. Models should be prepared for web use.

Consider for web delivery:

- Polygon count
- Texture resolution
- Texture compression
- Mesh compression
- Draw calls
- Material count
- Loading time
- Memory usage
- Mobile performance

Do not over-optimize to the point where the model visibly loses important details.

---

## Motion Design

3D motion must feel intentional and physically believable. Consider:

- Rotation
- Translation
- Scale
- Camera movement
- Orbital motion
- Parallax
- Entrance animation
- Hover interaction
- Scroll-driven motion
- Mouse interaction
- Touch interaction
- Idle animation
- Object reveal
- Assembly / disassembly
- State transitions

**Avoid unnecessary constant motion.**

Motion should communicate:

- Hierarchy
- Interaction
- Product features
- Depth
- Orientation
- State changes

---

## Physically Plausible Motion

When animating real-world objects:

Respect the object's physical constraints. For example:

- Hinges rotate around hinge axes.
- Wheels rotate around their axle.
- Doors rotate around their pivot.
- Mechanical components should maintain relationships.
- Connected parts should not randomly separate.
- Camera movement should maintain believable perspective.
- Objects should not visually penetrate each other unless intentionally required.

When the real mechanism is unknown, use the most plausible interpretation and **state the assumption**.

---

## Website Motion

For website animations, prefer:

- Smooth interpolation
- Easing
- Spring-like motion where appropriate
- Controlled timelines
- `requestAnimationFrame`-compatible approaches
- Efficient React state usage
- Animation libraries when they provide clear value

Avoid:

- Unnecessary React re-renders
- Expensive per-frame React state updates
- Excessive post-processing
- Unnecessary DOM/WebGL synchronization
- Animation that blocks interaction

---

## Scroll-Driven 3D

When implementing scroll-based 3D:

Use scroll position to control meaningful scene state. Examples:

| Scroll Progress → | Effect |
|---|---|
| Camera movement | Camera position / target shift |
| Model rotation | Object orientation |
| Component reveal | Visibility / opacity |
| Material transition | Shader / property interpolation |
| Scene transition | Environment / lighting change |

Keep animation deterministic. Do not make scroll interactions feel disconnected from the page.

---

## Interaction

Interactive models may support:

- Hover
- Click
- Drag
- Orbit
- Zoom
- Rotation
- Hotspots
- Component selection
- Camera focus
- Scroll interaction

Interactions should have:

- Clear visual feedback
- Sensible limits
- Mobile alternatives
- Accessibility considerations where applicable

---

## Camera

Camera design is part of the model presentation. Consider:

- Field of view
- Perspective
- Camera distance
- Target
- Framing
- Object scale
- Responsive viewport
- Mobile framing

Do not distort the model simply to compensate for a poor camera.

---

## Lighting

Lighting must reveal the model accurately. Consider:

- Key light
- Fill light
- Rim light
- Environment lighting
- Shadows
- Reflections
- Ambient occlusion
- Material response

Avoid lighting that hides important geometry.

---

## Materials

Materials should represent the reference accurately. Analyze:

- Base color
- Roughness
- Metallic properties
- Normal detail
- Clearcoat
- Transmission
- Emissive properties
- Texture scale

Do not use a generic material when the reference clearly requires a specific surface response.

---

## Performance

Always balance **Visual Accuracy** + **Web Performance**. Check:

- Model size
- Texture size
- Number of meshes
- Number of materials
- Draw calls
- Animation complexity
- Memory usage
- Mobile performance
- Loading behavior

Use progressive loading where appropriate. Show a useful loading state. Avoid making the page unusable while the model loads.

---

## Responsive Behavior

The 3D experience must work across:

- Desktop
- Laptop
- Tablet
- Mobile

Do not simply scale the desktop scene down. Adjust:

- Camera
- Model position
- Model scale
- Animation intensity
- Interaction behavior
- Quality settings

for smaller screens when necessary.

---

## Accessibility

3D must not become the only way to understand important information. Where appropriate provide:

- Text alternatives
- Accessible labels
- Reduced-motion behavior
- Keyboard-accessible interactions
- Fallback content

Respect `prefers-reduced-motion`.

---

## Quality Control

Before considering a 3D implementation complete, verify:

### Model

- [ ] Silhouette is accurate
- [ ] Proportions are accurate
- [ ] Important details are present
- [ ] Materials are appropriate
- [ ] Scale is consistent

### Motion

- [ ] Movement is intentional
- [ ] Pivots are correct
- [ ] Mechanical relationships are preserved
- [ ] Easing feels natural
- [ ] Animation does not cause visual artifacts

### Web

- [ ] Loading works
- [ ] Responsive behavior works
- [ ] Interactions work
- [ ] Performance is acceptable
- [ ] Mobile behavior is considered

### Final

- [ ] Compare implementation against references
- [ ] Identify visible inaccuracies
- [ ] Fix important inaccuracies
- [ ] Test again

---

## Accuracy Priority

Use this priority order:

1. Reference accuracy
2. Correct geometry
3. Correct proportions
4. Correct materials
5. Correct motion
6. Correct camera
7. User interaction
8. Performance optimization

If optimization conflicts with important visual accuracy, find a balanced solution rather than automatically reducing quality.

---

## Development Director Integration

This skill should be usable by the Development Director.

When a task involves **any** of the following, the Development Director should consider activating this skill:

- Creating a 3D model
- Recreating a physical object
- Adding 3D to a website
- Animating a 3D object
- Creating scroll-based 3D
- Creating product visualization
- Integrating GLB/GLTF
- Creating interactive 3D
- Optimizing web 3D

The skill provides methodology and quality criteria. It should **not** replace the Development Director.

---

## Output Behavior

When using this skill, prioritize practical implementation. Do not merely describe how a 3D experience could be built.

Determine:

- Required assets
- Required model structure
- Required technologies
- Animation strategy
- Camera strategy
- Material strategy
- Performance strategy
- Implementation steps
- Validation criteria

Then execute the work when possible.

---

## Final Principle

The objective is not:

> "Put a 3D model on a website."

The objective is:

> "Create a visually accurate, technically correct, performant, responsive, and naturally animated 3D experience that faithfully represents the intended object or reference."

**Accuracy first. Motion with purpose. Performance without unnecessary visual compromise.**
