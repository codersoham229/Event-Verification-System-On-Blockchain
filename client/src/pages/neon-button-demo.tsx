import { Button } from "@/components/ui/neon-button"
import { GlowCard } from "@/components/ui/spotlight-card"

export function NeonButtonDemo() {
  return (
    <div className="min-h-screen bg-black/90 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            Neon Button Components
          </h1>
          <p className="text-gray-400 text-lg">
            Experience futuristic button styles with neon glow effects
          </p>
        </div>

        {/* Default Variant */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">Default Variant</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlowCard glowColor="blue" size="md">
              <div className="flex flex-col items-center gap-4 py-8">
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large</Button>
              </div>
            </GlowCard>
          </div>
        </div>

        {/* Solid Variant */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">Solid Variant</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlowCard glowColor="purple" size="md">
              <div className="flex flex-col items-center gap-4 py-8">
                <Button variant="solid" size="sm">
                  Small Solid
                </Button>
                <Button variant="solid">
                  Submit
                </Button>
                <Button variant="solid" size="lg">
                  Large Solid
                </Button>
              </div>
            </GlowCard>
          </div>
        </div>

        {/* Ghost Variant */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">Ghost Variant</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlowCard glowColor="green" size="md">
              <div className="flex flex-col items-center gap-4 py-8">
                <Button variant="ghost" size="sm">
                  Small Ghost
                </Button>
                <Button variant="ghost">
                  Cancel
                </Button>
                <Button variant="ghost" size="lg">
                  Large Ghost
                </Button>
              </div>
            </GlowCard>
          </div>
        </div>

        {/* Without Neon Effect */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">Without Neon Glow</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlowCard glowColor="orange" size="md">
              <div className="flex flex-col items-center gap-4 py-8">
                <Button neon={false} size="sm">
                  Normal Small
                </Button>
                <Button neon={false}>
                  Normal Button
                </Button>
                <Button neon={false} size="lg">
                  Normal Large
                </Button>
              </div>
            </GlowCard>
          </div>
        </div>

        {/* All States */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">All Combinations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <GlowCard glowColor="blue" size="lg">
              <div className="flex flex-col gap-3 py-8 px-4">
                <p className="text-white font-semibold mb-4">Default Neon</p>
                <Button>Action</Button>
              </div>
            </GlowCard>
            
            <GlowCard glowColor="purple" size="lg">
              <div className="flex flex-col gap-3 py-8 px-4">
                <p className="text-white font-semibold mb-4">Solid Neon</p>
                <Button variant="solid">Submit</Button>
              </div>
            </GlowCard>
            
            <GlowCard glowColor="green" size="lg">
              <div className="flex flex-col gap-3 py-8 px-4">
                <p className="text-white font-semibold mb-4">Ghost Neon</p>
                <Button variant="ghost">Option</Button>
              </div>
            </GlowCard>
            
            <GlowCard glowColor="red" size="lg">
              <div className="flex flex-col gap-3 py-8 px-4">
                <p className="text-white font-semibold mb-4">No Neon</p>
                <Button neon={false}>Simple</Button>
              </div>
            </GlowCard>
          </div>
        </div>

        {/* Features */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p>3 button variants: default, solid, ghost</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p>3 size options: sm, default, lg</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p>Toggleable neon glow effect</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p>Smooth hover animations</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p>Full TypeScript support</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p>Customizable via className prop</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NeonButtonDemo
