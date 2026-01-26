# HTML COMPONENTS


<div class="tile up">Up</div>
<div class="tile down">Down</div>
<div class="tile padded up">
  <div class="tile down">Up &<br />Down</div>
</div>
<div class="tile button">
  <div class="tile"><span>Button</span></div>
</div>
<div class="tile tile--circle round">Up</div>
<div class="tile tile--circle round-down">Down</div>
<div class="tile tile--circle round-button"><span>Button</span></div>

# JS COMPONENTS
@import url("https://fonts.googleapis.com/css2?family=Alumni+Sans+Pinstripe&display=swap");

html {
  @media screen and (max-width: 600px) {
    font-size: 12px;
  }
}

:root {
  --height: 1;
}

$light: rgba(#fff, 0.5);
$shadow: rgba(#000, 0.5);

body {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  align-content: center;
  gap: 1rem;
  height: 100vh;
  background-color: #ddd;
  overflow: hidden;
  padding: 0 calc(50vw - 16rem);
  font-size: 1.5rem;
  color: #333;
  line-height: 0.9;
  font-family: "Alumni Sans Pinstripe", sans-serif;
  text-transform: uppercase;
  text-align: center;
}

.tile {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 6rem;
  height: 6rem;
  border-radius: 1rem;
  &:before,
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 1rem;
  }
  &--circle {
    border-radius: 50%;
    &:before {
      border-radius: 50%;
    }
  }
}

.padded {
  padding: 0.1rem;
}

.up {
  box-shadow: $shadow calc(0.33rem * var(--height))
    calc(0.33rem * var(--height)) 0.6rem;
  &:before {
    box-shadow: $light calc(-0.33rem * var(--height))
      calc(-0.33rem * var(--height)) 0.6rem;
  }
}

.down {
  box-shadow: inset $shadow calc(0.25rem * var(--height))
    calc(0.25rem * var(--height)) 0.6rem;
  &:before {
    box-shadow: inset $light calc(-0.25rem * var(--height))
      calc(-0.25rem * var(--height)) 0.6rem;
  }
}

.button {
  cursor: pointer;
  box-shadow: $shadow calc(0.33rem * var(--height))
    calc(0.33rem * var(--height)) 0.6rem;
  transition: box-shadow 0.15s 0.15s ease-in;
  &:before {
    box-shadow: $light calc(-0.33rem * var(--height))
      calc(-0.33rem * var(--height)) 0.6rem;
    transition: box-shadow 0.15s 0.15s ease-in;
  }
  span {
    transition: transform 0.3s ease-in-out;
  }
  & > div {
    box-shadow: inset $shadow 0 0 0;
    transition: box-shadow 0.15s ease-in;
    &:before {
      box-shadow: inset $light 0 0 0;
      transition: box-shadow 0.15s ease-in;
    }
  }
  &:hover {
    box-shadow: $shadow 0 0 0;
    transition: box-shadow 0.15s ease-out;
    &:before {
      box-shadow: $light 0 0 0;
      transition: box-shadow 0.15s ease-out;
    }
    & > div {
      box-shadow: inset rgba(#000, 50%) calc(0.25rem * var(--height))
        calc(0.25rem * var(--height)) 0.6rem;
      transition: box-shadow 0.15s 0.15s ease-out;
      &:before {
        box-shadow: inset $light calc(-0.25rem * var(--height))
          calc(-0.25rem * var(--height)) 0.6rem;
        transition: box-shadow 0.15s 0.15s ease-out;
      }
    }
    span {
      transform: translateY(0.1516rem);
    }
  }
}

.round {
  background: radial-gradient(circle at 40% 40%, $light, transparent, $shadow);
  box-shadow: $shadow 0.33rem 0.33rem 0.6rem;
}

.round-down {
  background: radial-gradient(circle at 75% 75%, $light, transparent, $shadow);
}

.round-button {
  cursor: pointer;
  background: radial-gradient(
    circle at 50% 50%,
    $light 15%,
    transparent 30%,
    $shadow
  );
  background-position: -4rem -4rem;
  background-size: 200% 200%;
  box-shadow: $shadow 0.33rem 0.33rem 0.6rem;
  transition: background 0.3s ease-in-out, box-shadow 0.15s 0.15s ease-in-out;
  span {
    transition: transform 0.3s ease-in-out;
  }
  &:hover {
    background-position: -2rem -2rem;
    box-shadow: $shadow 0 0 0;
    transition: background 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
    span {
      transform: translateY(0.1516rem);
    }
  }
}
